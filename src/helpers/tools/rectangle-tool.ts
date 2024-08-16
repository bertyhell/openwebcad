import { Point } from '@flatten-js/core';
import { RectangleEntity } from '../../entities/RectangleEntity.ts';
import {
  getActiveEntity,
  getEntities,
  setActiveEntity,
  setEntities,
} from '../../state.ts';

export function handleRectangleToolClick(worldClickPoint: Point) {
  const entities = getEntities();
  const activeEntity = getActiveEntity();

  let activeRectangle = activeEntity as RectangleEntity | null;
  if (!activeRectangle) {
    // Start a new rectangle
    activeRectangle = new RectangleEntity();
    setActiveEntity(activeRectangle);
  }
  const completed = activeRectangle.send(
    new Point(worldClickPoint.x, worldClickPoint.y),
  );

  if (completed) {
    // Finish the rectangle
    setEntities([...entities, activeRectangle]);
    setActiveEntity(null);
  }
}
