import { Point } from '@flatten-js/core';
import { SnapPoint, SnapPointType } from '../App.types';
import { pointDistance } from './distance-between-points.ts';

// /**
//  * Some points need to take priority over others when snapping to them. This multiplier is used to give a higher score to the points that should take priority
//  */
// const SNAP_POINT_PRIORITY: Record<SnapPointType, number> = {
//   [SnapPointType.AngleGuide]: 1,
//   [SnapPointType.LineEndPoint]: 5,
//   [SnapPointType.Intersection]: 2,
//   [SnapPointType.CircleCenter]: 3,
//   [SnapPointType.CircleCardinal]: 3,
//   [SnapPointType.CircleTangent]: 2,
//   [SnapPointType.LineMidPoint]: 4,
//   [SnapPointType.Point]: 5,
// };

/**
 * Finds the closest snap point to the target point
 * @param snapPoints
 * @param mouseLocation
 */
export function getClosestSnapPoint(
  snapPoints: SnapPoint[],
  mouseLocation: Point,
): [number, SnapPoint | null] {
  let closestSnapPoint: SnapPoint | null = null;
  let closestDistance: number = Infinity;

  snapPoints.forEach(snapPoint => {
    const distance = pointDistance(snapPoint.point, mouseLocation);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestSnapPoint = snapPoint;
    }
  });

  return [closestDistance, closestSnapPoint];
}

/**
 * First checks non angle guide snap points, then checks angle guide snap points
 * @param snapPoints
 * @param mouseLocation
 * @param maxDistance
 */
export function getClosestSnapPointWithinRadius(
  snapPoints: SnapPoint[],
  mouseLocation: Point,
  maxDistance: number,
): SnapPoint | null {
  const [closestDistance, closestSnapPoint] = getClosestSnapPoint(
    snapPoints.filter(snapPoint => snapPoint.type !== SnapPointType.AngleGuide),
    mouseLocation,
  );

  if (closestDistance < maxDistance) {
    return closestSnapPoint;
  }

  const [angleGuideDistance, angleGuideSnapPoint] = getClosestSnapPoint(
    snapPoints.filter(snapPoint => snapPoint.type === SnapPointType.AngleGuide),
    mouseLocation,
  );

  if (angleGuideDistance < maxDistance) {
    return angleGuideSnapPoint;
  }

  return null;
}
