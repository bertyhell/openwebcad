import { Line, Point } from '@flatten-js/core';
import { sortBy } from 'es-toolkit';
import { PointWithAngle } from './helpers.types';

/**
 * Sorts points that lie on a circle by angle around the circle, angle from 0 => 360
 * @param pointsOnCircle
 * @param centerPoint
 */
export function sortPointsOnCircle(
  pointsOnCircle: Point[],
  centerPoint: Point,
): Point[] {
  const pointsWithAngles: PointWithAngle[] = pointsOnCircle.map(point => {
    return {
      point,
      angle: new Line(centerPoint, point).slope,
    };
  });
  return sortBy(pointsWithAngles, [
    (pointWithAngle: PointWithAngle) => pointWithAngle.angle,
  ]).map(pointsWithAngle => pointsWithAngle.point);
}
