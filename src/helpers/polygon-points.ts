import { Point } from '@flatten-js/core';

export enum PolygonMode {
	/**
	 * The corners lie on the circle
	 */
	INSCRIBED = 'INSCRIBED',
	/**
	 * The middle of the sides touch the circle
	 */
	CIRCUMSCRIBED = 'CIRCUMSCRIBED',
}

/**
 * Corners of a regular polygon around the center
 * @param center
 * @param radiusPoint a corner (inscribed) or the middle of a side (circumscribed)
 * @param sideCount
 * @param mode
 */
export function getRegularPolygonPoints(
	center: Point,
	radiusPoint: Point,
	sideCount: number,
	mode: PolygonMode
): Point[] {
	const radius = Math.hypot(radiusPoint.x - center.x, radiusPoint.y - center.y);
	const angle = Math.atan2(radiusPoint.y - center.y, radiusPoint.x - center.x);
	const halfSideAngle = Math.PI / sideCount;
	const cornerRadius = mode === PolygonMode.INSCRIBED ? radius : radius / Math.cos(halfSideAngle);
	const startAngle = mode === PolygonMode.INSCRIBED ? angle : angle + halfSideAngle;
	return Array.from({ length: sideCount }, (_, index) => {
		const cornerAngle = startAngle + index * 2 * halfSideAngle;
		return new Point(
			center.x + cornerRadius * Math.cos(cornerAngle),
			center.y + cornerRadius * Math.sin(cornerAngle)
		);
	});
}
