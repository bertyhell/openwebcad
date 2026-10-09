import { Point } from '@flatten-js/core';
import type { Entity } from '../entities/Entity';
import { pointDistance } from '../helpers/distance-between-points';

/**
 * Scale entities by base vector to destination scale vector
 * @param entities
 * @param baseVectorStartPoint
 * @param baseVectorEndPoint
 * @param scaleVectorEndPoint
 */
export function scaleEntities(
	entities: Entity[],
	baseVectorStartPoint: Point,
	baseVectorEndPoint: Point,
	scaleVectorEndPoint: Point
) {
	const baseLength = pointDistance(baseVectorStartPoint, baseVectorEndPoint);
	if (baseLength === 0) {
		return; // There is no reference length to compare to
	}
	const scaleFactor = pointDistance(baseVectorStartPoint, scaleVectorEndPoint) / baseLength;
	for (const entity of entities) {
		entity.scale(baseVectorStartPoint, scaleFactor);
	}
}

/**
 * Point on the base vector that results in the given scale factor
 */
export function getPointForScaleFactor(
	baseVectorStartPoint: Point,
	baseVectorEndPoint: Point,
	scaleFactor: number
): Point {
	return new Point(
		baseVectorStartPoint.x + (baseVectorEndPoint.x - baseVectorStartPoint.x) * scaleFactor,
		baseVectorStartPoint.y + (baseVectorEndPoint.y - baseVectorStartPoint.y) * scaleFactor
	);
}
