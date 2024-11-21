import { Line, Point } from '@flatten-js/core';
import { sortBy } from 'es-toolkit';
import { PointWithAngle } from './helpers.types';
import { ArcEntity } from '../entities/ArcEntity';

/**
 * Sorts points that lie on an arc by angle around the arc, from start point to end point.
 * @param pointsOnArc
 * @param centerPoint
 * @param startPoint
 */
export function sortPointsOnArc(
  pointsOnArc: Point[],
  centerPoint: Point,
  startPoint: Point,
): Point[] {
  const firstPointAngle = ArcEntity.getAngle(centerPoint, startPoint);

  // Angles calculated from start point (0 degrees) and up
  const pointsWithAngles: PointWithAngle[] = pointsOnArc.map(point => {
    return {
      point,
      // Ensure all angles are between 0 (start point) and < 2PI,
      // so we can sort them starting at the start point angle
      angle:
        (new Line(centerPoint, point).slope - firstPointAngle + 2 * Math.PI) %
        (2 * Math.PI),
    };
  });
  return sortBy(pointsWithAngles, [
    (pointWithAngle: PointWithAngle) => pointWithAngle.angle,
  ]).map(pointsWithAngle => pointsWithAngle.point);
}
