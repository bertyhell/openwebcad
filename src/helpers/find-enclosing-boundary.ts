import {Arc, Box, Circle, type Point, Polygon, Segment, type Shape} from '@flatten-js/core';
import {minBy} from "es-toolkit";
import {EPSILON} from '../App.consts.ts';
import type {Edge} from '../App.types.ts';
import {calculateArea} from "./calculate-area.ts";
import {pointDistance} from './distance-between-points.ts';
import {findLoopsInEdges} from './find-loops-in-edges.ts';
import {getBoundingBoxOfMultipleEdges} from './get-bounding-box-of-multiple-entities.ts';
import {isPointInsideBoundary} from './is-point-inside-boundary.ts';
import {isPointInsideBox} from './is-point-inside-box.ts';
import {orderEdgeBoundary} from './order-edge-boundary.ts';
import {splitArcAtPoints} from "./split-edge-at-points.ts";
import {splitEdgesAtIntersections} from './split-edges-at-intersections.ts';
import {unionEdges} from "./union-edges.ts";

/**
 * Generates a string identifier for a Point
 * @param point
 * @param shapes
 */
export function findEnclosingBoundary(point: Point, shapes: Shape[]): (Segment | Arc)[] | null {
	const wholeShapeLoops: Edge[][] = [];

	const edges: Edge[] = [];
	for (const shape of shapes) {
		let loop: Edge[] | null = null;

		if (shape instanceof Circle && shape.contains(point)) {
			loop = [new Arc(shape.center, shape.r, 0, 2 * Math.PI, true)];
		} else if (shape instanceof Box && shape.contains(point)) {
			loop = shape.toSegments();
		} else if (shape instanceof Polygon && shape.contains(point)) {
			for (const face of shape.faces) {
				const edges = face.shapes as Edge[];
				const poly = new Polygon(edges);
				if (poly.contains(point)) {
					loop = edges;
					break;
				}
			}
		} else if (
			shape instanceof Arc &&
			(shape as Arc).sweep > Math.PI * 2 - EPSILON &&
			pointDistance((shape as Arc).center, point) < (shape as Arc).r.valueOf()
		) {
			const arc = shape as Arc;
			const equivalentCircle = new Circle(arc.center, arc.r.valueOf());
			if (equivalentCircle.contains(point)) {
				loop = [shape];
			}
		} else if (shape instanceof Segment || shape instanceof Arc) {
			edges.push(shape as Edge);
		}

		if (loop) {
			wholeShapeLoops.push(loop);
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
	const candidateLoops = [...wholeShapeLoops, ...segmentAndArcLoops];

	// filter out boundaries where the bounding box of the boundary doesn't contain the point
	const bbFiltered = candidateLoops.filter((loop) =>
		isPointInsideBox(getBoundingBoxOfMultipleEdges(loop), point)
	);

	// now do the more expensive check if the boundary contains the point
	const candidatesContainingPoint = bbFiltered.filter((loop) =>
		isPointInsideBoundary(loop, point)
	);

	if (candidatesContainingPoint.length === 0) return null;

	// Find the smallest boundary that contains the point
	const loopsWithArea = candidatesContainingPoint.map(loop => {
		return {
			loop,
			area: calculateArea(loop),
		}
	});
	const smallestBoundary = minBy(
		loopsWithArea,
		(loop) => loop.area
	) as { loop: Edge[]; area: number };

	const orderedBoundary = orderEdgeBoundary(smallestBoundary.loop);
	const unionedEdgesBoundary = unionEdges(orderedBoundary);
	return unionedEdgesBoundary;
}
