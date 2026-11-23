import type { Point } from '@flatten-js/core';
import { sortBy } from 'es-toolkit';
import { ArcEntity } from '../entities/ArcEntity';
import type { PointWithAngle } from './helpers.types';
import { normaliseAngleRadians } from './normalise-angle';

/**
 * Sorts points that lie on an arc in the direction of the arc, from start point to end point.
 * @param pointsOnArc
 * @param centerPoint
 * @param startPoint
 * @param counterClockwise direction of the arc, clockwise arcs come from mirroring, filleting or drawing an arc clockwise
 */
export function sortPointsOnArc(
	pointsOnArc: Point[],
	centerPoint: Point,
	startPoint: Point,
	counterClockwise = true
): Point[] {
	const firstPointAngle = ArcEntity.getAngle(centerPoint, startPoint);

	// Angles travelled from the start point (0 degrees) in the direction of the arc
	const pointsWithAngles: PointWithAngle[] = pointsOnArc.map((point) => {
		const angleFromStart = ArcEntity.getAngle(centerPoint, point) - firstPointAngle;
		return {
			point,
			// Ensure all angles are between 0 (start point) and < 2PI,
			// so we can sort them starting at the start point angle
			angle: normaliseAngleRadians(counterClockwise ? angleFromStart : -angleFromStart),
		};
	});
	return sortBy(pointsWithAngles, [(pointWithAngle: PointWithAngle) => pointWithAngle.angle]).map(
		(pointsWithAngle) => pointsWithAngle.point
	);
}
