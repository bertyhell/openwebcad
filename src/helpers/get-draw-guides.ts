import { Point } from '@flatten-js/core';
import { getIntersectionPoints } from './get-intersection-points';
import { SnapPoint, SnapPointType } from '../App.types';
import { getClosestSnapPointWithinRadius } from './get-closest-snap-point';
import { SNAP_ANGLE_DISTANCE } from '../App.consts';
import { getAngleGuideLines } from './get-angle-guide-lines';
import { findClosestEntity } from './find-closest-entity';
import { Entity } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { compact } from 'es-toolkit';

/**
 * Gets the angle guides from the angle point to the mouse if the mouse is close to one of the angle steps and also returns the closest snap point
 * @param entities entities that are drawn on the canvas
 * @param anglePoints the points that should get angle guides
 * @param worldMouseLocation the current mouse location
 * @param angleStep the angle in degrees at which the angle guides should be drawn
 * @param maxSnapDistance The distance that the mouse can snap to a snap point or angle guide
 */
export function getDrawHelpers(
  entities: Entity[],
  anglePoints: Point[],
  worldMouseLocation: Point,
  angleStep: number,
  maxSnapDistance: number,
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
      worldMouseLocation,
      angleGuideLines,
    );

    if (closestLineInfo.distance < SNAP_ANGLE_DISTANCE) {
      angleGuides.push(closestLineInfo.entity);
      nearestAngleSnapPoints.push({
        point: closestLineInfo.segment.start,
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

  const closestSnapPoint = getClosestSnapPointWithinRadius(
    entitySnapPoints,
    worldMouseLocation,
    maxSnapDistance,
  );

  if (closestSnapPoint) {
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
  const closestAngleSnapPoint = getClosestSnapPointWithinRadius(
    angleSnapPoints,
    worldMouseLocation,
    maxSnapDistance,
  );

  if (closestAngleSnapPoint) {
    angleSnapPoint = closestAngleSnapPoint;
  }

  return { angleGuides, entitySnapPoint, angleSnapPoint };
}
