import { Entity } from '../entities/Entity';
import { Point } from '@flatten-js/core';
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
  scaleVectorEndPoint: Point,
) {
  const scaleFactor =
    pointDistance(baseVectorStartPoint, scaleVectorEndPoint) /
    pointDistance(baseVectorStartPoint, baseVectorEndPoint);
  entities.forEach(entity => {
    return entity.scale(baseVectorStartPoint, scaleFactor);
  });
}
