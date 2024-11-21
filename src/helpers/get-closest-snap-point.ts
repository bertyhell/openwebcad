import { Point } from '@flatten-js/core';
import { SnapPoint, SnapPointType } from '../App.types';
import { pointDistance } from './distance-between-points';

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
 * @param worldSnapPoints
 * @param worldMouseLocation
 */
export function getClosestSnapPoint(
  worldSnapPoints: SnapPoint[],
  worldMouseLocation: Point,
): { distance: number; snapPoint: SnapPoint | null } {
  let closestSnapPoint: SnapPoint | null = null;
  let closestDistance: number = Infinity;

  worldSnapPoints.forEach(snapPoint => {
    const distance = pointDistance(snapPoint.point, worldMouseLocation);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestSnapPoint = snapPoint;
    }
  });

  return {
    distance: closestDistance,
    snapPoint: closestSnapPoint,
  };
}

/**
 * First checks non angle guide snap points, then checks angle guide snap points
 * @param worldSnapPoints
 * @param worldMouseLocation
 * @param maxDistance
 */
export function getClosestSnapPointWithinRadius(
  worldSnapPoints: SnapPoint[],
  worldMouseLocation: Point,
  maxDistance: number,
): SnapPoint | null {
  const { distance: closestDistance, snapPoint: closestSnapPoint } =
    getClosestSnapPoint(
      worldSnapPoints.filter(
        snapPoint => snapPoint.type !== SnapPointType.AngleGuide,
      ),
      worldMouseLocation,
    );

  if (closestDistance < maxDistance) {
    return closestSnapPoint;
  }

  const { distance: angleGuideDistance, snapPoint: angleGuideSnapPoint } =
    getClosestSnapPoint(
      worldSnapPoints.filter(
        snapPoint => snapPoint.type === SnapPointType.AngleGuide,
      ),
      worldMouseLocation,
    );

  if (angleGuideDistance < maxDistance) {
    return angleGuideSnapPoint;
  }

  return null;
}
