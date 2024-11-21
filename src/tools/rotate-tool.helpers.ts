import { Entity } from '../entities/Entity';
import { Line, Point } from '@flatten-js/core';

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
  endAnglePoint: Point,
) {
  const rotationAngle =
    new Line(rotateOrigin, endAnglePoint).slope -
    new Line(rotateOrigin, startAnglePoint).slope;
  entities.forEach(entity => {
    return entity.rotate(rotateOrigin, rotationAngle);
  });
}
