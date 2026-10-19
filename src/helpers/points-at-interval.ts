import type { Point } from '@flatten-js/core';
import type { Edge } from '../App.types.ts';
import type { Entity } from '../entities/Entity';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';

/**
 * Points along the edges every interval, starting from the start of the first edge
 * The start and end of the path are not included
 * @param edges edges that connect end to start, in order
 * @param interval distance between the points along the path
 */
export function getPointsAtInterval(edges: Edge[], interval: number): Point[] {
	if (interval <= 0) {
		return [];
	}
	const points: Point[] = [];
	let distanceBeforeEdge = 0;
	let nextDistance = interval;
	for (const edge of edges) {
		const edgeLength = edge.length;
		while (nextDistance < distanceBeforeEdge + edgeLength) {
			const point = edge.pointAtLength(nextDistance - distanceBeforeEdge);
			if (point) {
				points.push(point);
			}
			nextDistance += interval;
		}
		distanceBeforeEdge += edgeLength;
	}
	return points;
}

/**
 * Edges of the entity in the order of its path
 */
export function getPathEdges(entity: Entity): Edge[] {
	if (entity instanceof PolyLineEntity) {
		return entity.getOrderedEdges();
	}
	return entity.getEdges();
}
