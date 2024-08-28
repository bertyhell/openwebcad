import { CircleEntity } from '../../entities/CircleEntity.ts';
import { Point } from '@flatten-js/core';
import {
  getActiveEntity,
  getActiveLineColor,
  getActiveLineWidth,
  getEntities,
  setActiveEntity,
  setEntities,
} from '../../state.ts';

export function handleCircleToolClick(worldClickPoint: Point) {
  const entities = getEntities();
  const activeEntity = getActiveEntity();

  let activeCircle = activeEntity as CircleEntity | null;
  if (!activeCircle) {
    // Start a new rectangle
    activeCircle = new CircleEntity();
    activeCircle.lineColor = getActiveLineColor();
    activeCircle.lineWidth = getActiveLineWidth();
    setActiveEntity(activeCircle);
  }
  const completed = activeCircle.send(worldClickPoint);

  if (completed) {
    // Finish the rectangle
    setEntities([...entities, activeCircle]);
    setActiveEntity(null);
  }
}
