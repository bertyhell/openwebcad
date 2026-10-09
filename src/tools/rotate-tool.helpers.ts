import { Line, type Point } from '@flatten-js/core';
import type { Entity } from '../entities/Entity';

/**
 * Rotate entities round a base point by a certain angle
 * @param entities
 * @param rotateOrigin
 * @param startAnglePoint
 * @param endAnglePoint
 */
export function rotateEntities(
	entities: Entity[],
	rotateOrigin: Point,
	startAnglePoint: Point,
	endAnglePoint: Point
) {
	if (rotateOrigin.equalTo(startAnglePoint) || rotateOrigin.equalTo(endAnglePoint)) {
		return; // There is no angle when a point is on top of the origin
	}
	const rotationAngle =
		new Line(rotateOrigin, endAnglePoint).slope - new Line(rotateOrigin, startAnglePoint).slope;
	for (const entity of entities) {
		entity.rotate(rotateOrigin, rotationAngle);
	}
}

/**
 * Point that makes the given angle with the start angle point, around the rotation origin
 * @param angleInDegrees counterclockwise angle
 */
export function getPointAtAngle(
	rotateOrigin: Point,
	startAnglePoint: Point,
	angleInDegrees: number
): Point {
	return startAnglePoint.rotate((angleInDegrees * Math.PI) / 180, rotateOrigin);
}
