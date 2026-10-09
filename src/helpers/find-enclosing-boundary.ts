import {
	Arc,
	Box,
	Circle,
	PlanarSet,
	type Point,
	Polygon,
	Segment,
	type Shape,
} from '@flatten-js/core';
import { minBy } from 'es-toolkit';
import { EPSILON } from '../App.consts.ts';
import type { BoundingBox, Edge } from '../App.types.ts';
import { calculateArea } from './calculate-area.ts';
import { findLoopsInEdges } from './find-loops-in-edges.ts';
import type { BoundaryWithHoles, BoundaryWithHolesAndArea } from './find-loops-in-edges.types.ts';
import { getBoundingBoxOfMultipleEdges } from './get-bounding-box-of-multiple-entities.ts';
import { isApproxEqual } from './is-approx-equal.ts';
import { isPointInsideBoundary } from './is-point-inside-boundary.ts';
import { isPointInsideBox } from './is-point-inside-box.ts';
import { splitArcAtPoints } from './split-edge-at-points.ts';
import { splitEdgesAtIntersections } from './split-edges-at-intersections.ts';

/**
 * A closed loop of edges that can be used as the boundary of a fill
 * The bounding box and area are cached, since they are needed often when searching for the boundary around a point
 */
export interface CandidateLoop {
	boundary: Edge[];
	boundingBox: BoundingBox;
	area: number;
}

/**
 * Finds the smallest closed boundary around the point, including the holes inside that boundary
 * @param point the point that should be inside the boundary
 * @param shapes the shapes that can form the boundary
 */
export function findEnclosingBoundary(
	point: Point,
	shapes: Shape[]
): BoundaryWithHolesAndArea | null {
	return findEnclosingBoundaryInLoops(point, findCandidateLoops(shapes));
}

/**
 * Finds all closed loops that can be formed by the shapes
 * This is the expensive part of finding the enclosing boundary, so the result can be cached as long as the shapes don't change
 * @param shapes
 */
export function findCandidateLoops(shapes: Shape[]): CandidateLoop[] {
	const wholeShapeLoops: BoundaryWithHoles[] = [];

	const edges: Edge[] = [];
	for (const shape of shapes) {
		let loops: Edge[][] = [];

		if (shape instanceof Circle) {
			// Circle is converted to an arc
			loops = [[new Arc(shape.center, shape.r, 0, 2 * Math.PI, true)]];
		} else if (shape instanceof Box) {
			// Box is converted to segments
			loops = [shape.toSegments()];
		} else if (shape instanceof Polygon) {
			// Polygon is converted to segments and arcs
			loops = [...shape.faces].map((face) => face.shapes as Edge[]);
		} else if (shape instanceof Arc && (shape as Arc).sweep > Math.PI * 2 - EPSILON) {
			// Arc that forms a circle
			loops = [[shape]];
		} else if (shape instanceof Segment || shape instanceof Arc) {
			// Segments and arcs can be added directly
			edges.push(shape as Edge);
		}

		for (const loop of loops) {
			wholeShapeLoops.push({
				boundary: loop,
				holes: [],
			});
			edges.push(...loop);
		}
	}

	const edgeShapes: Edge[] = splitEdgesAtIntersections(edges);
	const edgeSegments = edgeShapes.filter((edge) => edge instanceof Segment);
	const edgeArcs = edgeShapes.filter((edge) => edge instanceof Arc);
	// Split the arcs in 2 parts to be able to match half circle + closing segment
	// Otherwise this is converted into 2 nodes that are connected with 2 edges. Which is not allowed by the graph solver
	const edgeArcsHalved = edgeArcs.flatMap((arc) => splitArcAtPoints(arc, [arc.middle()]));

	const segmentAndArcLoops = findLoopsInEdges([...edgeSegments, ...edgeArcsHalved]);

	return [
		...wholeShapeLoops.filter((loop) => !isLoopTouchingOtherEdges(loop, edges)),
		...segmentAndArcLoops,
	].map(
		(loop): CandidateLoop => ({
			boundary: loop.boundary,
			boundingBox: getBoundingBoxOfMultipleEdges(loop.boundary),
			area: calculateArea(loop.boundary),
		})
	);
}

/**
 * Checks if any edge that is not part of the loop intersects or touches the loop
 * Whole shape loops (eg: a full circle) that touch other edges are already found as smaller loops by findLoopsInEdges
 * If we keep them, they overlap with those smaller loops, and their unsplit edges break the hole detection in isLoopInsideLoop
 */
function isLoopTouchingOtherEdges(loop: BoundaryWithHoles, edges: Edge[]): boolean {
	const planarSet = new PlanarSet();
	for (const edge of edges) {
		if (!loop.boundary.includes(edge)) {
			planarSet.add(edge);
		}
	}
	return loop.boundary.some((loopEdge) =>
		(planarSet.search(loopEdge.box) as Edge[]).some(
			(otherEdge) => loopEdge.intersect(otherEdge).length > 0
		)
	);
}

/**
 * Finds the smallest loop that contains the point, and the loops inside that loop that form holes
 * @param point the point that should be inside the boundary
 * @param loops the loops calculated using findCandidateLoops
 */
export function findEnclosingBoundaryInLoops(
	point: Point,
	loops: CandidateLoop[]
): BoundaryWithHolesAndArea | null {
	// First filter out boundaries where the bounding box of the boundary doesn't contain the point
	// Then do the more expensive check if the boundary contains the point
	const candidatesContainingPoint = loops.filter(
		(loop) =>
			isPointInsideBox(loop.boundingBox, point) && isPointInsideBoundary(loop.boundary, point)
	);

	// Find the smallest boundary that contains the point
	const smallestLoop = minBy(candidatesContainingPoint, (loop) => loop.area);
	if (!smallestLoop) {
		return null;
	}

	return {
		boundary: smallestLoop.boundary,
		holes: findHoles(smallestLoop, loops).map((hole) => hole.boundary),
		area: smallestLoop.area,
	};
}

/**
 * Finds the outermost loops that are completely inside the outer loop
 * The loop finder doesn't nest loops that are not connected to each other, so we need to check this ourselves
 *
 * eg: for loop A, this returns B and D, but not C, since C is already excluded by B
 *  A
 *  |--------------------------------|
 *  |    B                 D         |
 *  |    |-----------|     |----|    |
 *  |    |   C       |     |----|    |
 *  |    |   |----|  |               |
 *  |    |   |----|  |               |
 *  |    |-----------|               |
 *  |--------------------------------|
 */
function findHoles(outerLoop: CandidateLoop, loops: CandidateLoop[]): CandidateLoop[] {
	const loopsInside: CandidateLoop[] = [];
	for (const loop of loops) {
		if (
			isLoopInsideLoop(loop, outerLoop) &&
			!loopsInside.some((loopInside) => isSameLoop(loopInside, loop))
		) {
			loopsInside.push(loop);
		}
	}

	// Only keep the outermost loops, the loops inside those loops are not holes of the outer loop
	return loopsInside.filter(
		(loop) => !loopsInside.some((otherLoop) => isLoopInsideLoop(loop, otherLoop))
	);
}

/**
 * Checks if the inner loop is completely inside the outer loop and not the same loop
 * Loops can touch the outer loop on its boundary, but cannot cross it
 */
function isLoopInsideLoop(innerLoop: CandidateLoop, outerLoop: CandidateLoop): boolean {
	if (innerLoop === outerLoop || innerLoop.area >= outerLoop.area - EPSILON) {
		return false;
	}
	if (!isBoxInsideBox(innerLoop.boundingBox, outerLoop.boundingBox)) {
		return false;
	}
	// Edges are split at intersections, so the middle of each edge is either inside, outside or on the outer boundary
	return innerLoop.boundary.every((edge) =>
		isPointInsideBoundary(outerLoop.boundary, edge.middle())
	);
}

function isSameLoop(loop1: CandidateLoop, loop2: CandidateLoop): boolean {
	return (
		isApproxEqual(loop1.area, loop2.area) &&
		isApproxEqual(loop1.boundingBox.minX, loop2.boundingBox.minX) &&
		isApproxEqual(loop1.boundingBox.minY, loop2.boundingBox.minY) &&
		isApproxEqual(loop1.boundingBox.maxX, loop2.boundingBox.maxX) &&
		isApproxEqual(loop1.boundingBox.maxY, loop2.boundingBox.maxY)
	);
}

function isBoxInsideBox(innerBox: BoundingBox, outerBox: BoundingBox): boolean {
	return (
		innerBox.minX >= outerBox.minX - EPSILON &&
		innerBox.minY >= outerBox.minY - EPSILON &&
		innerBox.maxX <= outerBox.maxX + EPSILON &&
		innerBox.maxY <= outerBox.maxY + EPSILON
	);
}
