import type { Point } from '@flatten-js/core';
import { SNAP_ANGLE_DISTANCE } from '../App.consts';
import { type SnapPoint, SnapPointType } from '../App.types';
import type { Entity } from '../entities/Entity';
import type { LineEntity } from '../entities/LineEntity';
import { findClosestEntity } from './find-closest-entity';
import { getAngleGuideLines } from './get-angle-guide-lines';
import { getClosestSnapPointWithinRadius } from './get-closest-snap-point';
import { getIntersectionPoints, getIntersectionPointsBetween } from './get-intersection-points';
import { getEntitySnapPointIndex } from './snap-point-index';

/**
 * Gets the angle guides from the angle point to the mouse if the mouse is close to one of the angle steps and also returns the closest snap point
 * @param entities entities that are drawn on the canvas
 * @param anglePoints the points that should get angle guides
 * @param worldMouseLocation the current mouse location
 * @param angleStep the angle in degrees at which the angle guides should be drawn
 * @param maxSnapDistance The distance that the mouse can snap to a snap point or angle guide
 */
export function getDrawHelpers(
	entities: Entity[],
	anglePoints: Point[],
	worldMouseLocation: Point,
	angleStep: number,
	maxSnapDistance: number
): {
	angleGuides: LineEntity[];
	entitySnapPoint: SnapPoint | null;
	angleSnapPoint: SnapPoint | null;
} {
	let entitySnapPoint: SnapPoint | null = null;
	let angleSnapPoint: SnapPoint | null = null;
	const nearestAngleSnapPoints: SnapPoint[] = [];
	const angleGuides: LineEntity[] = [];

	// draw angle guide
	for (const anglePoint of anglePoints) {
		const angleGuideLines = getAngleGuideLines(anglePoint, angleStep);

		const closestLineInfo = findClosestEntity<LineEntity>(worldMouseLocation, angleGuideLines);

		if (closestLineInfo.distance < SNAP_ANGLE_DISTANCE) {
			angleGuides.push(closestLineInfo.entity);
			nearestAngleSnapPoints.push({
				point: closestLineInfo.segment.start,
				type: SnapPointType.AngleGuide,
			});
		}
	}

	// Snap points of the entities don't change while the mouse moves, so they are cached
	entitySnapPoint = getEntitySnapPointIndex(entities).getClosestWithinRadius(
		worldMouseLocation,
		maxSnapDistance
	);

	// Only the intersections with the angle guides depend on the mouse location
	const angleSnapPoints: SnapPoint[] = [
		...nearestAngleSnapPoints,
		...[
			...getIntersectionPointsBetween(angleGuides, entities),
			...getIntersectionPoints(angleGuides),
		].map((point) => ({ point, type: SnapPointType.Intersection })),
	];
	angleSnapPoint = getClosestSnapPointWithinRadius(
		angleSnapPoints,
		worldMouseLocation,
		maxSnapDistance
	);

	return { angleGuides, entitySnapPoint, angleSnapPoint };
}
