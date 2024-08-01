import { DrawInfo } from '../App.types.ts';
import { Entity } from '../entities/Entitity.ts';
import {
  ANGLE_GUIDES_COLOR,
  CANVAS_BACKGROUND_COLOR,
  CANVAS_FOREGROUND_COLOR,
  CURSOR_SIZE,
  SNAP_POINT_COLOR,
  SNAP_POINT_SIZE,
} from '../App.consts.ts';
import { Point } from '@flatten-js/core';

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

export function drawSnapPoint(drawInfo: DrawInfo, snapPoint: Point | null) {
  if (!snapPoint) return;

  setLineStyles(drawInfo.context, false, false, SNAP_POINT_COLOR);

  drawInfo.context.strokeRect(
    snapPoint.x - SNAP_POINT_SIZE / 2,
    snapPoint.y - SNAP_POINT_SIZE / 2,
    SNAP_POINT_SIZE,
    SNAP_POINT_SIZE,
  );
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
