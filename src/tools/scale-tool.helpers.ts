import type {Point} from '@flatten-js/core';
import type {Entity} from '../entities/Entity';
import {pointDistance} from '../helpers/distance-between-points';

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
	const scaleFactor =
		pointDistance(baseVectorStartPoint, scaleVectorEndPoint) /
		pointDistance(baseVectorStartPoint, baseVectorEndPoint);
	for (const entity of entities) {
		entity.scale(baseVectorStartPoint, scaleFactor);
	}
}
