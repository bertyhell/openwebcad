import { DrawInfo, HoverPoint, SnapPoint } from '../App.types.ts';
import {
  clearCanvas,
  drawActiveEntity,
  drawCursor,
  drawDebugEntities,
  drawEntities,
  drawHelpers,
  drawSnapPoint,
} from './draw-functions.ts';
import { getClosestSnapPoint } from './get-closest-snap-point.ts';
import { compact } from './compact.ts';
import { isPointEqual } from './is-point-equal.ts';
import { Entity } from '../entities/Entitity.ts';
import { Point } from '@flatten-js/core';

export function draw(
  drawInfo: DrawInfo,
  entities: Entity[],
  debugEntities: Entity[],
  helperEntities: Entity[],
  activeEntity: Entity | null,
  snapPoint: SnapPoint | null,
  snapPointOnAngleGuide: SnapPoint | null,
  hoveredSnapPoints: HoverPoint[],
  worldMouseLocation: Point,
  shouldDrawCursor: boolean,
) {
  clearCanvas(drawInfo);

  drawHelpers(drawInfo, helperEntities);
  drawEntities(drawInfo, entities);
  drawDebugEntities(drawInfo, debugEntities);
  drawActiveEntity(drawInfo, activeEntity);

  const [, closestSnapPoint] = getClosestSnapPoint(
    compact([snapPoint, snapPointOnAngleGuide]),
    worldMouseLocation,
  );
  const isMarked =
    !!closestSnapPoint &&
    hoveredSnapPoints.some(hoveredSnapPoint =>
      isPointEqual(hoveredSnapPoint.snapPoint.point, closestSnapPoint.point),
    );
  // console.log('isMarked: ', isMarked);
  drawSnapPoint(drawInfo, closestSnapPoint, isMarked);

  drawCursor(drawInfo, shouldDrawCursor);
}
