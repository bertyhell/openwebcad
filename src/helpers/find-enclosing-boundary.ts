import {Arc, Box, Circle, type Point, Polygon, Segment, type Shape} from '@flatten-js/core';
import {EPSILON} from '../App.consts.ts';
import type {Edge} from '../App.types.ts';
import {pointDistance} from './distance-between-points.ts';
import {findLoopsInEdges} from './find-loops-in-edges.ts';
import {getBoundingBoxOfMultipleEdges} from './get-bounding-box-of-multiple-entities.ts';
import {isPointInsideBoundary} from './is-point-inside-boundary.ts';
import {isPointInsideBox} from './is-point-inside-box.ts';
import {orderEdgeBoundary} from './order-edge-boundary.ts';
import {splitEdgesAtIntersections} from './split-edges-at-intersections.ts';
import {calculateSizeIndicator} from "./calculate-size-indicator.ts";

/**
 * Generates a string identifier for a Point
 * @param point
 * @param shapes
 */
export function findEnclosingBoundary(point: Point, shapes: Shape[]): (Segment | Arc)[] | null {
	const candidates: { boundary: Edge[]; sizeIndicator: number }[] = [];

	const edges: Edge[] = [];
	for (const shape of shapes) {
		let loop: Edge[] | null = null;

		if (shape instanceof Circle && shape.contains(point)) {
			loop = [shape.toArc()];
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
			candidates.push({ boundary: loop, sizeIndicator: calculateSizeIndicator(loop, point) });
			edges.push(...loop);
		}
	}

	const edgeShapes: Edge[] = splitEdgesAtIntersections(edges);

	const loops = findLoopsInEdges(edgeShapes);
	candidates.push(
		...loops.map((loop): { boundary: Edge[]; sizeIndicator: number } => ({
			boundary: loop,
			sizeIndicator: calculateSizeIndicator(loop, point),
		}))
	);

	// ★ Actually use the BB filter result
	const bbFiltered = candidates.filter((c) =>
		isPointInsideBox(getBoundingBoxOfMultipleEdges(c.boundary), point)
	);

	const candidatesContainingPoint = bbFiltered.filter((c) =>
		isPointInsideBoundary(c.boundary, point)
	);

	if (candidatesContainingPoint.length === 0) return null;

	candidatesContainingPoint.sort((a, b) => a.sizeIndicator - b.sizeIndicator);
	const boundary = candidatesContainingPoint[0].boundary;

	return orderEdgeBoundary(boundary);
}
