import { DrawInfo, SnapPoint, SnapPointType } from '../App.types.ts';
import { Entity } from '../entities/Entity.ts';
import {
  ARROW_HEAD_LENGTH,
  ARROW_HEAD_WIDTH,
  CANVAS_BACKGROUND_COLOR,
  CURSOR_SIZE,
  GUIDE_LINE_COLOR,
  GUIDE_LINE_STYLE,
  GUIDE_LINE_WIDTH,
  MEASUREMENT_FONT_SIZE,
  SNAP_POINT_COLOR,
  SNAP_POINT_SIZE,
  TO_RADIANS,
} from '../App.consts.ts';
import { worldsToScreens, worldToScreen } from './world-screen-conversion.ts';
import {
  getScreenZoom,
  isEntityHighlighted,
  isEntitySelected,
} from '../state.ts';
import { Point, Vector } from '@flatten-js/core';

export function setLineStyles(
  context: CanvasRenderingContext2D,
  isHighlighted: boolean,
  isSelected: boolean,
  color: string,
  lineWidth: number,
  dash: number[] = [],
) {
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.setLineDash(dash);

  if (isHighlighted) {
    context.lineWidth = lineWidth + 1;
  }

  if (isSelected) {
    context.setLineDash([5, 5]);
  }
}

export function drawEntities(drawInfo: DrawInfo, entities: Entity[]) {
  entities.forEach(entity => {
    setLineStyles(
      drawInfo.context,
      isEntityHighlighted(entity),
      isEntitySelected(entity),
      entity.lineColor,
      entity.lineWidth,
    );
    entity.draw(drawInfo);
  });
}

export function drawDebugEntities(drawInfo: DrawInfo, debugEntities: Entity[]) {
  debugEntities.forEach(debugEntity => {
    setLineStyles(
      drawInfo.context,
      isEntityHighlighted(debugEntity),
      isEntitySelected(debugEntity),
      '#FF5500',
      1,
    );
    debugEntity.draw(drawInfo);
  });
}

/**
 * Draw the point to which the mouse will snap when the user clicks to draw the next point
 * @param drawInfo
 * @param worldSnapPoint
 * @param isMarked indicates that the point has been hovered lang enough to draw guides from this point
 */
export function drawSnapPoint(
  drawInfo: DrawInfo,
  worldSnapPoint: SnapPoint | null,
  isMarked: boolean,
) {
  if (!worldSnapPoint) return;

  const screenSnapPoint = worldToScreen(worldSnapPoint.point);

  setLineStyles(drawInfo.context, false, false, SNAP_POINT_COLOR, 1);
  const context = drawInfo.context;

  if (isMarked) {
    // We will draw a plus sign inside the current snap point to indicate that it is marked
    context.beginPath();
    context.moveTo(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y);
    context.lineTo(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y);
    context.moveTo(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2);
    context.lineTo(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2);
    context.stroke();
  }

  switch (worldSnapPoint.type) {
    case SnapPointType.LineEndPoint:
      // Endpoint is marked with a square
      context.strokeRect(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        SNAP_POINT_SIZE,
        SNAP_POINT_SIZE,
      );
      break;

    case SnapPointType.LineMidPoint:
      // Midpoint is shown with a triangle
      context.beginPath();
      context.moveTo(
        screenSnapPoint.x,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x + SNAP_POINT_SIZE / 2,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.closePath();
      context.stroke();
      break;

    case SnapPointType.AngleGuide:
      // Angle guide is shown with an hourglass
      context.beginPath();
      context.moveTo(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x + SNAP_POINT_SIZE / 2,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x + SNAP_POINT_SIZE / 2,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.closePath();
      context.stroke();
      break;

    case SnapPointType.Intersection:
      // Intersection is shown with a cross
      context.beginPath();
      context.moveTo(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x + SNAP_POINT_SIZE / 2,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.moveTo(
        screenSnapPoint.x + SNAP_POINT_SIZE / 2,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.stroke();
      break;

    case SnapPointType.CircleCenter:
      // Circle center is shown with a circle
      context.beginPath();
      context.arc(
        screenSnapPoint.x,
        screenSnapPoint.y,
        SNAP_POINT_SIZE / 2,
        0,
        2 * Math.PI,
      );
      context.stroke();
      break;

    case SnapPointType.CircleCardinal:
      // Circle cardinal is shown with a diamond
      context.beginPath();
      context.moveTo(
        screenSnapPoint.x,
        screenSnapPoint.y - SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x - SNAP_POINT_SIZE / 2,
        screenSnapPoint.y,
      );
      context.lineTo(
        screenSnapPoint.x,
        screenSnapPoint.y + SNAP_POINT_SIZE / 2,
      );
      context.lineTo(
        screenSnapPoint.x + SNAP_POINT_SIZE / 2,
        screenSnapPoint.y,
      );
      context.closePath();
      context.stroke();
      break;
  }
}

export function drawHelpers(drawInfo: DrawInfo, helperEntities: Entity[]) {
  helperEntities.forEach(entity => {
    setLineStyles(
      drawInfo.context,
      isEntityHighlighted(entity),
      isEntitySelected(entity),
      GUIDE_LINE_COLOR,
      GUIDE_LINE_WIDTH,
      GUIDE_LINE_STYLE,
    );
    entity.draw(drawInfo);
  });
}

export function drawCursor(drawInfo: DrawInfo, drawCursor: boolean) {
  if (!drawCursor) return;

  setLineStyles(drawInfo.context, false, false, '#FFF', 1);

  drawInfo.context.beginPath();
  drawInfo.context.moveTo(
    drawInfo.screenMouseLocation.x,
    drawInfo.screenMouseLocation.y - CURSOR_SIZE,
  );
  drawInfo.context.lineTo(
    drawInfo.screenMouseLocation.x,
    drawInfo.screenMouseLocation.y + CURSOR_SIZE,
  );
  drawInfo.context.moveTo(
    drawInfo.screenMouseLocation.x - CURSOR_SIZE,
    drawInfo.screenMouseLocation.y,
  );
  drawInfo.context.lineTo(
    drawInfo.screenMouseLocation.x + CURSOR_SIZE,
    drawInfo.screenMouseLocation.y,
  );
  drawInfo.context.stroke();
}

export function clearCanvas(drawInfo: DrawInfo) {
  if (drawInfo.canvasSize === null) return;

  if (!drawInfo.context) return;

  drawInfo.context.fillStyle = CANVAS_BACKGROUND_COLOR;
  drawInfo.context.fillRect(
    0,
    0,
    drawInfo.canvasSize?.x,
    drawInfo.canvasSize?.y,
  );
}

/**
 * Draws a line from startPoint to endPoint and auto converts to screen space first
 * @param context
 * @param startPoint
 * @param endPoint
 */
export function drawLine(
  context: CanvasRenderingContext2D,
  startPoint: Point,
  endPoint: Point,
): void {
  const [screenStartPoint, screenEndPoint] = worldsToScreens([
    startPoint,
    endPoint,
  ]);

  context.beginPath();
  context.moveTo(screenStartPoint.x, screenStartPoint.y);
  context.lineTo(screenEndPoint.x, screenEndPoint.y);
  context.stroke();
}

/**
 * Draws an arrow head which ends at the endPoint
 * The start point doesn't really matter, only the direction
 * the size of the arrow is determined by ARROW_HEAD_SIZE
 * @param context
 * @param startPoint
 * @param endPoint
 */
export function drawArrowHead(
  context: CanvasRenderingContext2D,
  startPoint: Point,
  endPoint: Point,
): void {
  const vectorFromEndToStart = new Vector(endPoint, startPoint);
  const vectorFromEndToStartUnit = vectorFromEndToStart.normalize();
  const baseOfArrow = endPoint
    .clone()
    .translate(
      vectorFromEndToStartUnit.multiply(ARROW_HEAD_LENGTH * getScreenZoom()),
    );
  const perpendicularVector1 = vectorFromEndToStartUnit.rotate(90 * TO_RADIANS);
  const perpendicularVector2 = vectorFromEndToStartUnit.rotate(
    -90 * TO_RADIANS,
  );
  const leftCornerOfArrow = baseOfArrow
    .clone()
    .translate(
      perpendicularVector1.multiply(ARROW_HEAD_WIDTH * getScreenZoom()),
    );
  const rightCornerOfArrow = baseOfArrow
    .clone()
    .translate(
      perpendicularVector2.multiply(ARROW_HEAD_WIDTH * getScreenZoom()),
    );

  const [screenEndPoint, screenLeftCornerOfArrow, screenRightCornerOfArrow] =
    worldsToScreens([endPoint, leftCornerOfArrow, rightCornerOfArrow]);

  context.beginPath();
  context.moveTo(screenEndPoint.x, screenEndPoint.y);
  context.lineTo(screenLeftCornerOfArrow.x, screenLeftCornerOfArrow.y);
  context.lineTo(screenRightCornerOfArrow.x, screenRightCornerOfArrow.y);
  context.lineTo(screenEndPoint.x, screenEndPoint.y);
  context.fillStyle = '#FFF';
  context.stroke();
  context.fill();
}

export function drawText(
  context: CanvasRenderingContext2D,
  label: string,
  basePoint: Point,
  normalUnit: Vector,
): void {
  const screenBasePoint = worldToScreen(basePoint);
  context.save();
  context.translate(screenBasePoint.x, screenBasePoint.y);
  const angle = Math.atan2(normalUnit.y, normalUnit.x);
  context.rotate(angle);
  context.font = `${MEASUREMENT_FONT_SIZE * getScreenZoom()}px sans-serif`;
  context.textAlign = 'center';
  context.fillText(label, 0, 0);
  context.restore();
}
