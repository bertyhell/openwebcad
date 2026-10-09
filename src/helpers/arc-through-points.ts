import { Point } from '@flatten-js/core';
import { ArcEntity } from '../entities/ArcEntity';

const EPSILON = 1e-9;

/**
 * Center of the circle through 3 points, null when the points are on one line
 */
export function getCircleCenterThroughPoints(p1: Point, p2: Point, p3: Point): Point | null {
	const determinant = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
	if (Math.abs(determinant) < EPSILON) {
		return null;
	}
	const p1Squared = p1.x * p1.x + p1.y * p1.y;
	const p2Squared = p2.x * p2.x + p2.y * p2.y;
	const p3Squared = p3.x * p3.x + p3.y * p3.y;
	return new Point(
		(p1Squared * (p2.y - p3.y) + p2Squared * (p3.y - p1.y) + p3Squared * (p1.y - p2.y)) /
			determinant,
		(p1Squared * (p3.x - p2.x) + p2Squared * (p1.x - p3.x) + p3Squared * (p2.x - p1.x)) /
			determinant
	);
}

/**
 * Arc that starts at the start point, passes through the middle point and ends at the end point
 * Returns null when the points are on one line
 */
export function getArcThroughPoints(
	startPoint: Point,
	pointOnArc: Point,
	endPoint: Point
): ArcEntity | null {
	const center = getCircleCenterThroughPoints(startPoint, pointOnArc, endPoint);
	if (!center) {
		return null;
	}
	const radius = Math.hypot(startPoint.x - center.x, startPoint.y - center.y);
	// The arc turns counterclockwise when the middle point is to the right of start => end
	const cross =
		(pointOnArc.x - startPoint.x) * (endPoint.y - startPoint.y) -
		(pointOnArc.y - startPoint.y) * (endPoint.x - startPoint.x);
	return new ArcEntity(
		center,
		radius,
		Math.atan2(startPoint.y - center.y, startPoint.x - center.x),
		Math.atan2(endPoint.y - center.y, endPoint.x - center.x),
		cross > 0
	);
}
