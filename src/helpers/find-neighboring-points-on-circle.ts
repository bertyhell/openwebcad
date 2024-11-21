import { Circle, Point } from '@flatten-js/core';
import { uniqWith } from 'es-toolkit';
import { isPointEqual } from './is-point-equal';
import { CircleEntity } from '../entities/CircleEntity';
import { sortPointsOnCircle } from './sort-points-on-circle';

/**
 * Find the closest points on the circle on both sides of the clicked point
 * @param clickedPointOnShape
 * @param circle
 * @param pointsOnShape
 */
export function findNeighboringPointsOnCircle(
  clickedPointOnShape: Point,
  circle: CircleEntity,
  pointsOnShape: Point[],
): [Point, Point] {
  // Sort points from start point to endpoint
  const sortedPoints = sortPointsOnCircle(
    uniqWith([...pointsOnShape, clickedPointOnShape], isPointEqual),
    (circle.getShape() as Circle).center,
  );

  const indexOfClickedPoint: number = sortedPoints.findIndex(point =>
    isPointEqual(clickedPointOnShape, point),
  );
  if (indexOfClickedPoint === -1) {
    throw new Error(
      'Clicked point not found on line in function findNeighboringPointsOnCircle',
    );
  }

  // We must make sure that points lying on both sides of the 0 angle are still considered neighbors
  // So we add the number of points and take the modulo of the number of points again (so index -1 becomes length - 1)
  return [
    sortedPoints[
      (indexOfClickedPoint + sortedPoints.length - 1) % sortedPoints.length
    ],
    sortedPoints[
      (indexOfClickedPoint + sortedPoints.length + 1) % sortedPoints.length
    ],
  ];
}
