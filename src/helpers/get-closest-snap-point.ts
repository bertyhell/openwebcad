import { Point } from '@flatten-js/core';
import { SnapPoint, SnapPointType } from '../App.types';
import { pointDistance } from './distance-between-points.ts';

/**
 * Some points need to take priority over others when snapping to them. This multiplier is used to give a higher score to the points that should take priority
 */
const SNAP_POINT_DISTANCE_MULTIPLIER: Record<SnapPointType, number> = {
  [SnapPointType.AngleGuide]: 1,
  [SnapPointType.LineEndPoint]: 50,
  [SnapPointType.Intersection]: 20,
  [SnapPointType.CircleCenter]: 30,
  [SnapPointType.CircleCardinal]: 30,
  [SnapPointType.CircleTangent]: 20,
  [SnapPointType.LineMidPoint]: 40,
  [SnapPointType.Point]: 50,
};

export function getClosestSnapPoint(
  snapPoints: SnapPoint[],
  targetPoint: Point,
): [number, SnapPoint | null] {
  let closestSnapPoint: SnapPoint | null = null;
  let closestDistance: number = Infinity;
  let closestDistanceScore: number = 0;

  snapPoints.forEach(snapPoint => {
    const distance = pointDistance(snapPoint.point, targetPoint);
    const distanceScore =
      (1 / distance) * SNAP_POINT_DISTANCE_MULTIPLIER[snapPoint.type];

    if (distanceScore > closestDistanceScore) {
      closestDistanceScore = distanceScore;
      closestDistance = distance;
      closestSnapPoint = snapPoint;
    }
  });

  return [closestDistance, closestSnapPoint];
}
