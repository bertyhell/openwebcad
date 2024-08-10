import { DrawInfo, SnapPoint, SnapPointType } from '../App.types.ts';
import { Entity } from '../entities/Entitity.ts';
import {
  ANGLE_GUIDES_COLOR,
  CANVAS_BACKGROUND_COLOR,
  CANVAS_FOREGROUND_COLOR,
  CURSOR_SIZE,
  SNAP_POINT_COLOR,
  SNAP_POINT_SIZE,
} from '../App.consts.ts';

export function setLineStyles(
  context: CanvasRenderingContext2D,
  isHighlighted: boolean,
  isSelected: boolean,
  color: string = CANVAS_FOREGROUND_COLOR,
  dash: number[] = [],
) {
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.setLineDash(dash);

  if (isHighlighted) {
    context.lineWidth = 2;
  }

  if (isSelected) {
    context.setLineDash([5, 5]);
  }
}

export function drawEntities(drawInfo: DrawInfo, entities: Entity[]) {
  entities.forEach(entity => {
    setLineStyles(drawInfo.context, entity.isHighlighted, entity.isSelected);
    entity.draw(drawInfo);
  });
}

export function drawDebugEntities(drawInfo: DrawInfo, debugEntities: Entity[]) {
  debugEntities.forEach(debugEntity => {
    setLineStyles(
      drawInfo.context,
      debugEntity.isHighlighted,
      debugEntity.isSelected,
      '#FF5500',
    );
    debugEntity.draw(drawInfo);
  });
}

/**
 * Draw the point to which the mouse will snap when the user clicks to draw the next point
 * @param drawInfo
 * @param snapPoint
 * @param isMarked indicates that the point has been hovered lang enough to draw guides from this point
 */
export function drawSnapPoint(
  drawInfo: DrawInfo,
  snapPoint: SnapPoint | null,
  isMarked: boolean,
) {
  if (!snapPoint) return;

  setLineStyles(drawInfo.context, false, false, SNAP_POINT_COLOR);

  if (isMarked) {
    // We will draw a plus sign inside the current snap point to indicate that it is marked
    drawInfo.context.beginPath();
    drawInfo.context.moveTo(
      snapPoint.point.x - SNAP_POINT_SIZE / 2,
      snapPoint.point.y,
    );
    drawInfo.context.lineTo(
      snapPoint.point.x + SNAP_POINT_SIZE / 2,
      snapPoint.point.y,
    );
    drawInfo.context.moveTo(
      snapPoint.point.x,
      snapPoint.point.y - SNAP_POINT_SIZE / 2,
    );
    drawInfo.context.lineTo(
      snapPoint.point.x,
      snapPoint.point.y + SNAP_POINT_SIZE / 2,
    );
    drawInfo.context.stroke();
  }

  switch (snapPoint.type) {
    case SnapPointType.LineEndPoint:
      // Endpoint is marked with a square
      drawInfo.context.strokeRect(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
        SNAP_POINT_SIZE,
        SNAP_POINT_SIZE,
      );
      break;

    case SnapPointType.LineMidPoint:
      // Midpoint is shown with a triangle
      drawInfo.context.beginPath();
      drawInfo.context.moveTo(
        snapPoint.point.x,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x + SNAP_POINT_SIZE / 2,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.closePath();
      drawInfo.context.stroke();
      break;

    case SnapPointType.AngleGuide:
      // Angle guide is shown with an hourglass
      drawInfo.context.beginPath();
      drawInfo.context.moveTo(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x + SNAP_POINT_SIZE / 2,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x + SNAP_POINT_SIZE / 2,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.closePath();
      drawInfo.context.stroke();
      break;

    case SnapPointType.Intersection:
      // Intersection is shown with a cross
      drawInfo.context.beginPath();
      drawInfo.context.moveTo(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x + SNAP_POINT_SIZE / 2,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.moveTo(
        snapPoint.point.x + SNAP_POINT_SIZE / 2,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.stroke();
      break;

    case SnapPointType.CircleCenter:
      // Circle center is shown with a circle
      drawInfo.context.beginPath();
      drawInfo.context.arc(
        snapPoint.point.x,
        snapPoint.point.y,
        SNAP_POINT_SIZE / 2,
        0,
        2 * Math.PI,
      );
      drawInfo.context.stroke();
      break;

    case SnapPointType.CircleCardinal:
      // Circle cardinal is shown with a diamond
      drawInfo.context.beginPath();
      drawInfo.context.moveTo(
        snapPoint.point.x,
        snapPoint.point.y - SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x - SNAP_POINT_SIZE / 2,
        snapPoint.point.y,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x,
        snapPoint.point.y + SNAP_POINT_SIZE / 2,
      );
      drawInfo.context.lineTo(
        snapPoint.point.x + SNAP_POINT_SIZE / 2,
        snapPoint.point.y,
      );
      drawInfo.context.closePath();
      drawInfo.context.stroke();
      break;
  }
}

export function drawHelpers(drawInfo: DrawInfo, helperEntities: Entity[]) {
  helperEntities.forEach(entity => {
    setLineStyles(
      drawInfo.context,
      entity.isHighlighted,
      entity.isSelected,
      ANGLE_GUIDES_COLOR,
      [1, 5],
    );
    entity.draw(drawInfo);
  });
}

export function drawActiveEntity(
  drawInfo: DrawInfo,
  activeEntity: Entity | null,
) {
  setLineStyles(drawInfo.context, false, false);
  activeEntity?.draw(drawInfo);
}

export function drawCursor(drawInfo: DrawInfo, drawCursor: boolean) {
  if (!drawCursor) return;

  setLineStyles(drawInfo.context, false, false);

  drawInfo.context.beginPath();
  drawInfo.context.moveTo(drawInfo.mouse.x, drawInfo.mouse.y - CURSOR_SIZE);
  drawInfo.context.lineTo(drawInfo.mouse.x, drawInfo.mouse.y + CURSOR_SIZE);
  drawInfo.context.moveTo(drawInfo.mouse.x - CURSOR_SIZE, drawInfo.mouse.y);
  drawInfo.context.lineTo(drawInfo.mouse.x + CURSOR_SIZE, drawInfo.mouse.y);
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
