import {
  drawCursor,
  drawDebugEntities,
  drawEntities,
  drawHelpers,
  drawSnapPoint,
} from './draw-functions';
import { getClosestSnapPoint } from './get-closest-snap-point';
import { isPointEqual } from './is-point-equal';
import { HOVERED_SNAP_POINT_TIME } from '../App.consts';
import { compact } from 'es-toolkit';
import {
  getAngleGuideEntities,
  getDebugEntities,
  getEntities,
  getGhostHelperEntities,
  getHoveredSnapPoints,
  getInputController,
  getShouldDrawCursor,
  getSnapPoint,
  getSnapPointOnAngleGuide,
} from '../state';
import { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController';

export function draw(drawController: ScreenCanvasDrawController) {
  drawController.clearCanvas();

  drawHelpers(drawController, getAngleGuideEntities());
  drawEntities(drawController, getGhostHelperEntities());
  drawEntities(drawController, getEntities());
  drawDebugEntities(drawController, getDebugEntities());

  const { snapPoint: closestSnapPoint } = getClosestSnapPoint(
    compact([getSnapPoint(), getSnapPointOnAngleGuide()]),
    drawController.getWorldMouseLocation(),
  );
  const isMarked =
    !!closestSnapPoint &&
    getHoveredSnapPoints().some(
      hoveredSnapPoint =>
        hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME &&
        isPointEqual(hoveredSnapPoint.snapPoint.point, closestSnapPoint.point),
    );
  drawSnapPoint(drawController, closestSnapPoint, isMarked);

  drawCursor(drawController, getShouldDrawCursor());
  getInputController().draw(drawController);
}
