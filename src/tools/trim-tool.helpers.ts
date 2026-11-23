import { type Circle, Point, Segment } from '@flatten-js/core';
import { compact, minBy, sumBy, uniqWith } from 'es-toolkit';
import type { Edge } from '../App.types';
import { ArcEntity } from '../entities/ArcEntity';
import type { CircleEntity } from '../entities/CircleEntity';
import type { Entity } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity';
import {
	edgesToEntity,
	getLengthUpToPoint,
	getPathLength,
	getSubPath,
	isClosedPath,
} from '../helpers/break-entity';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { findNeighboringPointsOnArc } from '../helpers/find-neighboring-points-on-arc';
import { findNeighboringPointsOnCircle } from '../helpers/find-neighboring-points-on-circle';
import { findNeighboringPointsOnLine } from '../helpers/find-neighboring-points-on-line';
import { getAngleWithXAxis } from '../helpers/get-angle-with-x-axis.ts';
import { isPointEqual } from '../helpers/is-point-equal';
import { chainSegments } from '../helpers/order-edge-boundary';
import { addEntities, deleteEntities } from '../state';

export function getAllIntersectionPoints(entity: Entity, entities: Entity[]): Point[] {
	// TODO see if we need to make this list unique
	return compact(
		entities
			.filter((otherEntity) => otherEntity.id !== entity.id)
			.flatMap((otherEntity) => {
				if (entity.id === otherEntity.id) {
					return null;
				}
				return entity.getIntersections(otherEntity);
			})
	);
}

/**
 * The outcome of trimming an entity, computed without touching the state
 * so it can be used both to preview the trim and to apply it
 */
export interface TrimResult {
	/** Entities that are replaced by the trim */
	original: Entity[];
	/** Entities that stay after the trim */
	remaining: Entity[];
	/** The parts that are removed by the trim */
	removed: Entity[];
}

export function applyTrimResult(trimResult: TrimResult): void {
	// Helper functions should never trigger an undo state, since they can be called multiple times during one user operation
	deleteEntities(trimResult.original, false);
	addEntities(trimResult.remaining, false);
}

export function trimLineSegment(
	line: LineEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): TrimResult {
	const segment = line.getShape() as Segment;
	const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnLine(
		clickedPointOnShape,
		segment.start,
		segment.end,
		intersections
	);

	// The cut lines keep the style and layer of the original line
	const cutLines: Entity[] = line.cutAtPoints([firstCutPoint, secondCutPoint]);
	// Remove the segment that has the clickedPointOnShape point on it
	return {
		original: [line],
		remaining: cutLines.filter((cutLine) => !cutLine.containsPointOnShape(clickedPointOnShape)),
		removed: cutLines.filter((cutLine) => cutLine.containsPointOnShape(clickedPointOnShape)),
	};
}

export function eraseLineSegment(
	line: LineEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): void {
	applyTrimResult(trimLineSegment(line, clickedPointOnShape, intersections));
}

/**
 * Removes the part of the circle between the closest intersections on both sides of the clicked point
 * Returns null when the circle crosses other entities at only one point, since one point can't mark a part of the circle
 */
export function trimCircleSegment(
	circle: CircleEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): TrimResult | null {
	const cutPoints = uniqWith(intersections, isPointEqual);
	if (cutPoints.length === 0) {
		// Nothing crosses the circle, so the whole circle is removed, like a line without intersections
		return { original: [circle], remaining: [], removed: [circle] };
	}
	if (cutPoints.length === 1) {
		// A tangent line or a line that ends on the circle would otherwise turn the circle into an arc without a length
		return null;
	}

	const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnCircle(
		clickedPointOnShape,
		circle,
		cutPoints
	);

	const circleShape = circle.getShape() as Circle;
	const center = circleShape.center;

	const angles = [firstCutPoint, secondCutPoint, clickedPointOnShape].map((p) =>
		getAngleWithXAxis(new Point(center.x, center.y), new Point(p.x, p.y))
	);

	const [startAngle, endAngle] = isAngleBetween(angles[2], angles[0], angles[1])
		? [angles[1], angles[0]]
		: [angles[0], angles[1]];

	const createArc = (arcStartAngle: number, arcEndAngle: number): ArcEntity => {
		return copyEntityBaseProperties(
			circle,
			new ArcEntity(center, circleShape.r, arcStartAngle, arcEndAngle, true)
		);
	};

	return {
		original: [circle],
		remaining: [createArc(startAngle, endAngle)],
		removed: [createArc(endAngle, startAngle)],
	};
}

export function eraseCircleSegment(
	circle: CircleEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): void {
	const trimResult = trimCircleSegment(circle, clickedPointOnShape, intersections);
	if (trimResult) {
		applyTrimResult(trimResult);
	}
}

function isAngleBetween(angle: number, start: number, end: number): boolean {
	const twoPi = 2 * Math.PI;
	return (angle - start + twoPi) % twoPi <= (end - start + twoPi) % twoPi;
}

export function trimArcSegment(
	arc: ArcEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): TrimResult {
	const [first, second] = findNeighboringPointsOnArc(clickedPointOnShape, arc, intersections);

	if (isPointEqual(first, second)) {
		return { original: [arc], remaining: [], removed: [arc] };
	}

	const cutArcs = arc.cutAtPoints([first, second]);
	return {
		original: [arc],
		remaining: cutArcs.filter((cutArc) => !cutArc.containsPointOnShape(clickedPointOnShape)),
		removed: cutArcs.filter((cutArc) => cutArc.containsPointOnShape(clickedPointOnShape)),
	};
}

export function eraseArcSegment(
	arc: ArcEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): void {
	applyTrimResult(trimArcSegment(arc, clickedPointOnShape, intersections));
}

/**
 * Edges of a polyline or rectangle in the order of the path, every edge starts where the previous edge ends
 */
function getOrientedPathEdges(entity: Entity): Edge[] {
	if (entity instanceof PolyLineEntity) {
		// Segments of a polyline can be stored in any direction, eg: when they were joined by PEDIT or imported
		return chainSegments(entity.entities).map((segment) => segment.getShape() as Edge);
	}
	return entity.getEdges();
}

function edgeToEntity(edge: Edge): LineEntity | ArcEntity {
	return edge instanceof Segment ? new LineEntity(edge) : new ArcEntity(edge);
}

/**
 * Removes a part of the clicked segment of a polyline or rectangle
 * The segment is cut at the closest intersections or corners on both sides of the clicked point
 * The rest of the path stays together: an open path becomes 2 pieces, a closed path becomes 1 open piece
 * @param entity polyline or rectangle
 * @param clickedPointOnShape point on the entity closest to the mouse
 * @param cuttingEntities entities that can cut the segment, the entity itself is ignored
 */
export function trimPathSegment(
	entity: Entity,
	clickedPointOnShape: Point,
	cuttingEntities: Entity[]
): TrimResult | null {
	const edges = getOrientedPathEdges(entity);
	const clickedEdgeIndex = edges.indexOf(
		minBy(edges, (edge) => edge.distanceTo(clickedPointOnShape)[0]) as Edge
	);
	if (clickedEdgeIndex === -1) {
		return null;
	}
	const clickedEdge = edges[clickedEdgeIndex];
	const clickedEdgeEntity = edgeToEntity(clickedEdge);

	// Other segments of the same path can also cut the clicked segment, eg: when a polyline crosses itself
	const otherEdgeEntities = edges
		.filter((_edge, index) => index !== clickedEdgeIndex)
		.map(edgeToEntity);
	const intersections = getAllIntersectionPoints(clickedEdgeEntity, [
		...cuttingEntities.filter((cuttingEntity) => cuttingEntity.id !== entity.id),
		...otherEdgeEntities,
	]);
	const [firstCutPoint, secondCutPoint] =
		clickedEdgeEntity instanceof LineEntity
			? findNeighboringPointsOnLine(
					clickedPointOnShape,
					clickedEdge.start,
					clickedEdge.end,
					intersections
				)
			: findNeighboringPointsOnArc(clickedPointOnShape, clickedEdgeEntity, intersections);

	// Distances along the path where the removed part starts and ends
	const clickedEdgeStart = sumBy(edges.slice(0, clickedEdgeIndex), (edge) => edge.length);
	const removeFrom = clickedEdgeStart + getLengthUpToPoint(clickedEdge, firstCutPoint);
	const removeTo = clickedEdgeStart + getLengthUpToPoint(clickedEdge, secondCutPoint);
	const pathLength = getPathLength(edges);

	const remainingPaths = isClosedPath(edges)
		? // The rest of a closed path runs from the end of the removed part, across the start of the path, to the start of the removed part
			[[...getSubPath(edges, removeTo, pathLength), ...getSubPath(edges, 0, removeFrom)]]
		: [getSubPath(edges, 0, removeFrom), getSubPath(edges, removeTo, pathLength)];

	// The pieces keep the style and layer of the original entity
	return {
		original: [entity],
		remaining: compact(remainingPaths.map((path) => edgesToEntity(path, entity))),
		removed: compact([edgesToEntity(getSubPath(edges, removeFrom, removeTo), entity)]),
	};
}
