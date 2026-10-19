import { type Point, Segment } from '@flatten-js/core';
import { EPSILON } from '../App.consts.ts';
import type { Edge } from '../App.types.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { type Entity, EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { copyEntityBaseProperties } from './copy-entity-base-properties.ts';
import { isPointEqual } from './is-point-equal.ts';
import { getPathEdges } from './points-at-interval.ts';

const BREAKABLE_TYPES = [
	EntityName.Line,
	EntityName.Arc,
	EntityName.Circle,
	EntityName.Rectangle,
	EntityName.PolyLine,
];

export function isBreakable(entity: Entity): boolean {
	return BREAKABLE_TYPES.includes(entity.getType());
}

function getPathLength(edges: Edge[]): number {
	return edges.reduce((length, edge) => length + edge.length, 0);
}

/**
 * Part of an edge from its start up to the point
 */
function getLengthUpToPoint(edge: Edge, point: Point): number {
	if (edge instanceof Segment) {
		return edge.start.distanceTo(point)[0];
	}
	const [firstPart] = edge.split(point);
	return firstPart?.length ?? 0;
}

/**
 * Distance along the path from its start to the point on the path closest to the given point
 */
export function getDistanceAlongPath(edges: Edge[], point: Point): number {
	let closest = { distance: Number.MAX_VALUE, distanceAlongPath: 0 };
	let distanceBeforeEdge = 0;
	for (const edge of edges) {
		const [distance, segmentToEdge] = point.distanceTo(edge);
		if (distance < closest.distance) {
			closest = {
				distance,
				distanceAlongPath: distanceBeforeEdge + getLengthUpToPoint(edge, segmentToEdge.end),
			};
		}
		distanceBeforeEdge += edge.length;
	}
	return closest.distanceAlongPath;
}

/**
 * The edges between two distances along the path, the first and last edge are cut where needed
 */
export function getSubPath(edges: Edge[], from: number, to: number): Edge[] {
	const subPath: Edge[] = [];
	let distanceBeforeEdge = 0;
	for (const edge of edges) {
		const edgeStart = distanceBeforeEdge;
		const edgeEnd = distanceBeforeEdge + edge.length;
		distanceBeforeEdge = edgeEnd;
		const partStart = Math.max(from, edgeStart);
		const partEnd = Math.min(to, edgeEnd);
		if (partEnd - partStart <= EPSILON) {
			continue;
		}
		let part: Edge | null | undefined = edge;
		if (partStart > edgeStart + EPSILON) {
			part = part.split(part.pointAtLength(partStart - edgeStart) as Point)[1];
		}
		if (part && partEnd < edgeEnd - EPSILON) {
			part = part.split(part.pointAtLength(partEnd - partStart) as Point)[0];
		}
		if (part) {
			subPath.push(part);
		}
	}
	return subPath;
}

function edgesToEntity(edges: Edge[], original: Entity): Entity | null {
	const entities = edges.map((edge) =>
		edge instanceof Segment ? new LineEntity(edge) : new ArcEntity(edge)
	);
	if (!entities.length) {
		return null;
	}
	const entity = entities.length === 1 ? entities[0] : new PolyLineEntity(entities);
	return copyEntityBaseProperties(original, entity);
}

function isClosedPath(edges: Edge[]): boolean {
	return edges.length > 0 && isPointEqual(edges[0].start, (edges.at(-1) as Edge).end);
}

/**
 * Whether the closed path goes counterclockwise, using points along the edges so arcs count too
 */
function isCounterClockwise(edges: Edge[]): boolean {
	const points = edges.flatMap((edge) => [edge.start, edge.middle()]);
	let doubleSignedArea = 0;
	points.forEach((point, index) => {
		const nextPoint = points[(index + 1) % points.length];
		doubleSignedArea += point.x * nextPoint.y - nextPoint.x * point.y;
	});
	return doubleSignedArea >= 0;
}

function reversePath(edges: Edge[]): Edge[] {
	return edges.map((edge) => edge.reverse()).reverse();
}

/**
 * Removes the part of the entity between the two points
 * For closed entities (eg: circles) the part from the first point counterclockwise to the second point is removed
 * Returns the remaining pieces, or null if the entity can't be broken
 */
export function breakEntity(
	entity: Entity,
	firstPoint: Point,
	secondPoint: Point
): Entity[] | null {
	if (!isBreakable(entity)) {
		return null;
	}
	const pathEdges = getPathEdges(entity);
	const isClosed = isClosedPath(pathEdges);
	const edges = isClosed && !isCounterClockwise(pathEdges) ? reversePath(pathEdges) : pathEdges;
	const pathLength = getPathLength(edges);
	const first = getDistanceAlongPath(edges, firstPoint);
	const second = getDistanceAlongPath(edges, secondPoint);

	let remainingPaths: Edge[][];
	if (isClosed) {
		// The remaining part runs from the second point to the first point, possibly across the start of the path
		remainingPaths =
			first <= second
				? [[...getSubPath(edges, second, pathLength), ...getSubPath(edges, 0, first)]]
				: [getSubPath(edges, second, first)];
	} else {
		const start = Math.min(first, second);
		const end = Math.max(first, second);
		remainingPaths = [getSubPath(edges, 0, start), getSubPath(edges, end, pathLength)];
	}
	return remainingPaths
		.map((path) => edgesToEntity(path, entity))
		.filter((piece): piece is Entity => !!piece);
}
