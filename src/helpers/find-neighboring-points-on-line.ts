import { Point } from '@flatten-js/core';
import { sortBy, uniqWith } from 'es-toolkit';
import { isPointEqual } from './is-point-equal';
import { pointDistance } from './distance-between-points';

/**
 * Find the closest points on both sides of the clicked point
 * @param clickedPointOnLine
 * @param lineStartPoint
 * @param lineEndPoint
 * @param pointsOnLine
 */
export function findNeighboringPointsOnLine(
  clickedPointOnLine: Point,
  lineStartPoint: Point,
  lineEndPoint: Point,
  pointsOnLine: Point[],
): [Point, Point] {
  // Sort points from start point to endpoint
  const sortedPoints = sortBy(
    uniqWith(
      [lineStartPoint, ...pointsOnLine, clickedPointOnLine, lineEndPoint],
      isPointEqual,
    ),
    [(pointOnLine): number => pointDistance(lineStartPoint, pointOnLine)],
  );

  const indexOfClickedPoint: number = sortedPoints.findIndex(point =>
    isPointEqual(clickedPointOnLine, point),
  );
  if (indexOfClickedPoint === -1) {
    throw new Error(
      'Clicked point not found on line in function findNeighboringPointsOnLine',
    );
  }

  return [
    sortedPoints[indexOfClickedPoint - 1] || lineStartPoint,
    sortedPoints[indexOfClickedPoint + 1] || lineEndPoint,
  ];
}
