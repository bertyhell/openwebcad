import type { Arc, Point } from '@flatten-js/core';
import { uniqWith } from 'es-toolkit';
import type { ArcEntity } from '../entities/ArcEntity';
import { isPointEqual } from './is-point-equal';
import { sortPointsOnArc } from './sort-points-on-arc';

/**
 * Find the closest points on the arc on both sides of the clicked point
 * The start and end point of the arc are used when there is no other point on that side
 * @param clickedPointOnShape
 * @param arc
 * @param pointsOnShape
 */
export function findNeighboringPointsOnArc(
	clickedPointOnShape: Point,
	arc: ArcEntity,
	pointsOnShape: Point[]
): [Point, Point] {
	const arcShape = arc.getShape() as Arc;
	// Sort points from start point to endpoint in the direction of the arc
	// Unlike a circle, an arc doesn't continue past its end, so the start and end point limit the part that is removed
	const sortedPoints = sortPointsOnArc(
		uniqWith([arcShape.start, ...pointsOnShape, clickedPointOnShape, arcShape.end], isPointEqual),
		arcShape.center,
		arcShape.start,
		arcShape.counterClockwise
	);

	const indexOfClickedPoint: number = sortedPoints.findIndex((point) =>
		isPointEqual(clickedPointOnShape, point)
	);
	if (indexOfClickedPoint === -1) {
		throw new Error('Clicked point not found on line in function findNeighboringPointsOnArc');
	}

	return [
		sortedPoints[indexOfClickedPoint - 1] ?? arcShape.start,
		sortedPoints[indexOfClickedPoint + 1] ?? arcShape.end,
	];
}
