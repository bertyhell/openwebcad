import { Point } from '@flatten-js/core';
import { getIntersectionPoints } from './get-intersection-points.ts';
import { SnapPoint, SnapPointType } from '../App.types.ts';
import { getClosestSnapPoint } from './get-closest-snap-point.ts';
import { SNAP_ANGLE_DISTANCE, SNAP_POINT_DISTANCE } from '../App.consts.ts';
import { getAngleGuideLines } from './get-angle-guide-lines.ts';
import { findClosestEntity } from './find-closest-entity.ts';
import { Entity } from '../entities/Entitity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { compact } from './compact.ts';

/**
 * Gets the angle guide from the start point to the mouse if the mouse is close to one of the angle steps and also returns the closest snap point
 * @param entities
 * @param firstPoint
 * @param mouseLocation
 * @param angleStep
 */
export function getDrawHelpers(
  entities: Entity[],
  firstPoint: Point | null,
  mouseLocation: Point,
  angleStep: number,
): { angleGuide: LineEntity | null; snapPoint: SnapPoint | null } {
  let snapPoint: SnapPoint | null = null;
  let angleSnapPoint: SnapPoint | null = null;
  let angleGuide: LineEntity | null = null;

  // draw angle guide
  if (firstPoint) {
    const angleGuideLines = getAngleGuideLines(firstPoint, angleStep);

    const closestLineInfo = findClosestEntity<LineEntity>(
      mouseLocation,
      angleGuideLines,
    );

    if (closestLineInfo[0] < SNAP_ANGLE_DISTANCE) {
      angleGuide = closestLineInfo[2];
      angleSnapPoint = {
        point: closestLineInfo[1].start,
        type: SnapPointType.AngleGuide,
      };
    }
  }

  // Calculate snap points
  const snapPoints = [
    ...entities.flatMap(entity => {
      return entity.getSnapPoints();
    }),
    ...getIntersectionPoints(compact([...entities, angleGuide])).map(point => ({
      point,
      type: SnapPointType.Intersection,
    })),
  ];

  const [closestSnapPointDistance, closestSnapPoint] = getClosestSnapPoint(
    snapPoints,
    mouseLocation,
  );

  if (closestSnapPoint && closestSnapPointDistance < SNAP_POINT_DISTANCE) {
    snapPoint = closestSnapPoint;
  }

  return { angleGuide, snapPoint: snapPoint || angleSnapPoint };
}
