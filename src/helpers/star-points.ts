import { Point } from '@flatten-js/core';

/**
 * Corners of a star around the center, alternating between the first and the second circle
 * @param center
 * @param firstRadiusPoint the tip of the first star point, lies on the first circle
 * @param secondRadius radius of the second circle, the corners between the star points lie on it
 * @param pointCount number of star points
 */
export function getStarPoints(
	center: Point,
	firstRadiusPoint: Point,
	secondRadius: number,
	pointCount: number
): Point[] {
	const firstRadius = Math.hypot(firstRadiusPoint.x - center.x, firstRadiusPoint.y - center.y);
	const startAngle = Math.atan2(firstRadiusPoint.y - center.y, firstRadiusPoint.x - center.x);
	const halfPointAngle = Math.PI / pointCount;
	return Array.from({ length: pointCount * 2 }, (_, index) => {
		const radius = index % 2 === 0 ? firstRadius : secondRadius;
		const cornerAngle = startAngle + index * halfPointAngle;
		return new Point(
			center.x + radius * Math.cos(cornerAngle),
			center.y + radius * Math.sin(cornerAngle)
		);
	});
}
