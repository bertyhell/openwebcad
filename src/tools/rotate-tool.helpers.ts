import {Line, type Point} from '@flatten-js/core';
import type {Entity} from '../entities/Entity';

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
	const rotationAngle =
		new Line(rotateOrigin, endAnglePoint).slope - new Line(rotateOrigin, startAnglePoint).slope;
	for (const entity of entities) {
		entity.rotate(rotateOrigin, rotationAngle);
	}
}
