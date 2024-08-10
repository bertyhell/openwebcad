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
 * Gets the angle guides from the angle point to the mouse if the mouse is close to one of the angle steps and also returns the closest snap point
 * @param entities entities that are drawn on the canvas
 * @param anglePoints the points that should get angle guides
 * @param mouseLocation the current mouse location
 * @param angleStep the angle in degrees at which the angle guides should be drawn
 */
export function getDrawHelpers(
  entities: Entity[],
  anglePoints: Point[],
  mouseLocation: Point,
  angleStep: number,
): {
  angleGuides: LineEntity[];
  entitySnapPoint: SnapPoint | null;
  angleSnapPoint: SnapPoint | null;
} {
  let entitySnapPoint: SnapPoint | null = null;
  let angleSnapPoint: SnapPoint | null = null;
  const nearestAngleSnapPoints: SnapPoint[] = [];
  const angleGuides: LineEntity[] = [];

  // draw angle guide
  anglePoints.forEach(anglePoint => {
    const angleGuideLines = getAngleGuideLines(anglePoint, angleStep);

    const closestLineInfo = findClosestEntity<LineEntity>(
      mouseLocation,
      angleGuideLines,
    );

    if (closestLineInfo[0] < SNAP_ANGLE_DISTANCE) {
      angleGuides.push(closestLineInfo[2]);
      nearestAngleSnapPoints.push({
        point: closestLineInfo[1].start,
        type: SnapPointType.AngleGuide,
      });
    }
  });

  // Calculate snap points
  const entitySnapPoints = [
    ...entities.flatMap(entity => {
      return entity.getSnapPoints();
    }),
    ...getIntersectionPoints(compact(entities)).map(point => ({
      point,
      type: SnapPointType.Intersection,
    })),
  ];

  const [closestSnapPointDistance, closestSnapPoint] = getClosestSnapPoint(
    entitySnapPoints,
    mouseLocation,
  );

  if (closestSnapPoint && closestSnapPointDistance < SNAP_POINT_DISTANCE) {
    entitySnapPoint = closestSnapPoint;
  }

  const angleSnapPoints = [
    ...nearestAngleSnapPoints,
    // TODO only search for intersections between angle guides and other angle guides and between angle guides and entities, but not between entities
    ...getIntersectionPoints([...compact(entities), ...angleGuides]).map(
      point => ({
        point,
        type: SnapPointType.Intersection,
      }),
    ),
  ];
  const [closestAngleSnapPointDistance, closestAngleSnapPoint] =
    getClosestSnapPoint(angleSnapPoints, mouseLocation);

  if (
    closestAngleSnapPoint &&
    closestAngleSnapPointDistance < SNAP_POINT_DISTANCE
  ) {
    angleSnapPoint = closestAngleSnapPoint;
  }

  return { angleGuides, entitySnapPoint, angleSnapPoint };
}
