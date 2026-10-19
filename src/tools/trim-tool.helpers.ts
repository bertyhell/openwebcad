import { type Circle, Point, type Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import { ArcEntity } from '../entities/ArcEntity';
import type { CircleEntity } from '../entities/CircleEntity';
import type { Entity } from '../entities/Entity';
import type { LineEntity } from '../entities/LineEntity';
import { findNeighboringPointsOnArc } from '../helpers/find-neighboring-points-on-arc';
import { findNeighboringPointsOnCircle } from '../helpers/find-neighboring-points-on-circle';
import { findNeighboringPointsOnLine } from '../helpers/find-neighboring-points-on-line';
import { getAngleWithXAxis } from '../helpers/get-angle-with-x-axis.ts';
import { isPointEqual } from '../helpers/is-point-equal';
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

	const cutLines: Entity[] = line.cutAtPoints([firstCutPoint, secondCutPoint]).map((cutLine) =>
		Object.assign(cutLine, {
			lineColor: line.lineColor,
			lineWidth: line.lineWidth,
		})
	);
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

export function trimCircleSegment(
	circle: CircleEntity,
	clickedPointOnShape: Point,
	intersections: Point[]
): TrimResult {
	if (intersections.length === 0) {
		return { original: [circle], remaining: [], removed: [circle] };
	}

	const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnCircle(
		clickedPointOnShape,
		circle,
		intersections
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
		const arc = new ArcEntity(center, circleShape.r, arcStartAngle, arcEndAngle, true);
		Object.assign(arc, {
			lineColor: circle.lineColor,
			lineWidth: circle.lineWidth,
		});
		return arc;
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
	applyTrimResult(trimCircleSegment(circle, clickedPointOnShape, intersections));
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
