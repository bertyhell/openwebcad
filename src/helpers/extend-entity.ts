import { type Arc, type Point, type Segment, Vector } from '@flatten-js/core';
import { ArcEntity } from '../entities/ArcEntity';
import { CircleEntity } from '../entities/CircleEntity';
import { type Entity, EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { copyEntityBaseProperties } from './copy-entity-base-properties';

/**
 * How far a line is searched for a boundary to extend to
 */
const MAX_EXTEND_DISTANCE = 1_000_000;
const EPSILON = 1e-7;
const FULL_CIRCLE = 2 * Math.PI;

function getIntersectionsWithBoundaries(probe: Entity, boundaries: Entity[]): Point[] {
	return boundaries.flatMap((boundary) => boundary.getIntersections(probe));
}

/**
 * Extends the end of the line closest to the click point, until it hits one of the boundaries
 */
function extendLine(line: LineEntity, clickPoint: Point, boundaries: Entity[]): LineEntity | null {
	const segment = line.getShape() as Segment;
	const extendEnd =
		clickPoint.distanceTo(segment.end)[0] <= clickPoint.distanceTo(segment.start)[0];
	const fixedPoint = extendEnd ? segment.start : segment.end;
	const movingPoint = extendEnd ? segment.end : segment.start;
	const direction = new Vector(fixedPoint, movingPoint).normalize();
	const probe = new LineEntity(
		movingPoint,
		movingPoint.translate(direction.multiply(MAX_EXTEND_DISTANCE))
	);

	let closestPoint: Point | null = null;
	let closestDistance = Number.POSITIVE_INFINITY;
	for (const intersection of getIntersectionsWithBoundaries(probe, boundaries)) {
		const distance = movingPoint.distanceTo(intersection)[0];
		if (distance > EPSILON && distance < closestDistance) {
			closestDistance = distance;
			closestPoint = intersection;
		}
	}
	if (!closestPoint) {
		return null;
	}
	return extendEnd
		? new LineEntity(fixedPoint, closestPoint)
		: new LineEntity(closestPoint, fixedPoint);
}

function normalizeAngle(angle: number): number {
	return ((angle % FULL_CIRCLE) + FULL_CIRCLE) % FULL_CIRCLE;
}

/**
 * Extends the end of the arc closest to the click point along its circle, until it hits one of the boundaries
 */
function extendArc(
	arcEntity: ArcEntity,
	clickPoint: Point,
	boundaries: Entity[]
): ArcEntity | null {
	const arc = arcEntity.getShape() as Arc;
	const extendEnd = clickPoint.distanceTo(arc.end)[0] <= clickPoint.distanceTo(arc.start)[0];
	// Walk along the circle away from the arc: forwards from the end, backwards from the start
	const walkDirection = (arc.counterClockwise ? 1 : -1) * (extendEnd ? 1 : -1);
	const fromAngle = extendEnd ? arc.endAngle : arc.startAngle;
	const currentSweep = arc.sweep;

	const probe = new CircleEntity(arc.center, arc.r.valueOf());
	let closestDelta = Number.POSITIVE_INFINITY;
	for (const intersection of getIntersectionsWithBoundaries(probe, boundaries)) {
		const angle = Math.atan2(intersection.y - arc.center.y, intersection.x - arc.center.x);
		const delta = normalizeAngle((angle - fromAngle) * walkDirection);
		// The extended arc can't overlap itself
		if (delta > EPSILON && delta < FULL_CIRCLE - currentSweep - EPSILON && delta < closestDelta) {
			closestDelta = delta;
		}
	}
	if (!Number.isFinite(closestDelta)) {
		return null;
	}
	const newAngle = fromAngle + closestDelta * walkDirection;
	return new ArcEntity(
		arc.center,
		arc.r.valueOf(),
		extendEnd ? arc.startAngle : newAngle,
		extendEnd ? newAngle : arc.endAngle,
		arc.counterClockwise
	);
}

/**
 * Extends a line or arc at the end closest to the click point, up to the nearest boundary entity
 * The result keeps the id and style of the original entity, so it can replace it
 * @returns null when the entity can't be extended or there is no boundary in the way
 */
export function extendEntity(
	entity: Entity,
	clickPoint: Point,
	boundaries: Entity[]
): Entity | null {
	const otherBoundaries = boundaries.filter((boundary) => boundary.id !== entity.id);
	let extended: Entity | null = null;
	if (entity.getType() === EntityName.Line) {
		extended = extendLine(entity as LineEntity, clickPoint, otherBoundaries);
	} else if (entity.getType() === EntityName.Arc) {
		extended = extendArc(entity as ArcEntity, clickPoint, otherBoundaries);
	}
	if (!extended) {
		return null;
	}
	copyEntityBaseProperties(entity, extended);
	extended.id = entity.id;
	return extended;
}
