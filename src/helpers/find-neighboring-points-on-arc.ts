import { Arc, Point } from '@flatten-js/core';
import { uniqWith } from 'es-toolkit';
import { isPointEqual } from './is-point-equal';
import { ArcEntity } from '../entities/ArcEntity';
import { sortPointsOnArc } from './sort-points-on-arc';

/**
 * Find the closest points on the arc on both sides of the clicked point
 * @param clickedPointOnShape
 * @param arc
 * @param pointsOnShape
 */
export function findNeighboringPointsOnArc(
  clickedPointOnShape: Point,
  arc: ArcEntity,
  pointsOnShape: Point[],
): [Point, Point] {
  // Sort points from start point to endpoint
  const sortedPoints = sortPointsOnArc(
    uniqWith([...pointsOnShape, clickedPointOnShape], isPointEqual),
    (arc.getShape() as Arc).center,
    (arc.getShape() as Arc).start,
  );

  const indexOfClickedPoint: number = sortedPoints.findIndex(point =>
    isPointEqual(clickedPointOnShape, point),
  );
  if (indexOfClickedPoint === -1) {
    throw new Error(
      'Clicked point not found on line in function findNeighboringPointsOnArc',
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
