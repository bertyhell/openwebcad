import { DrawInfo } from '../App.types.ts';
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
import { HOVERED_SNAP_POINT_TIME } from '../App.consts.ts';
import { compact } from 'es-toolkit';
import {
  getActiveEntity,
  getDebugEntities,
  getEntities,
  getHelperEntities,
  getHoveredSnapPoints,
  getShouldDrawCursor,
  getSnapPoint,
  getSnapPointOnAngleGuide,
  getWorldMouseLocation,
} from '../state.ts';

export function draw(drawInfo: DrawInfo) {
  clearCanvas(drawInfo);

  drawHelpers(drawInfo, getHelperEntities());
  drawEntities(drawInfo, getEntities());
  drawDebugEntities(drawInfo, getDebugEntities());
  drawActiveEntity(drawInfo, getActiveEntity());

  const { snapPoint: closestSnapPoint } = getClosestSnapPoint(
    compact([getSnapPoint(), getSnapPointOnAngleGuide()]),
    getWorldMouseLocation(),
  );
  const isMarked =
    !!closestSnapPoint &&
    getHoveredSnapPoints().some(
      hoveredSnapPoint =>
        hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME &&
        isPointEqual(hoveredSnapPoint.snapPoint.point, closestSnapPoint.point),
    );
  drawSnapPoint(drawInfo, closestSnapPoint, isMarked);

  drawCursor(drawInfo, getShouldDrawCursor());
}
