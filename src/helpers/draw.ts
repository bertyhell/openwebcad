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
import { isPointEqual } from './is-point-equal.ts';
import { Entity } from '../entities/Entitity.ts';
import { Point } from '@flatten-js/core';
import { HOVERED_SNAP_POINT_TIME } from '../App.consts.ts';
import { compact } from 'es-toolkit';

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
    hoveredSnapPoints.some(
      hoveredSnapPoint =>
        hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME &&
        isPointEqual(hoveredSnapPoint.snapPoint.point, closestSnapPoint.point),
    );
  drawSnapPoint(drawInfo, closestSnapPoint, isMarked);

  drawCursor(drawInfo, shouldDrawCursor);
}
