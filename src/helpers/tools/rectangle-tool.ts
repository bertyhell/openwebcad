import { Entity } from '../../entities/Entitity.ts';
import { Dispatch, SetStateAction } from 'react';
import { Point } from '@flatten-js/core';
import { RectangleEntity } from '../../entities/RectangleEntity.ts';

export function handleRectangleToolClick(
  activeEntity: Entity | null,
  setActiveEntity: Dispatch<SetStateAction<Entity | null>>,
  entities: Entity[],
  setEntities: Dispatch<SetStateAction<Entity[]>>,
  mousePoint: Point,
) {
  let activeRectangle = activeEntity as RectangleEntity | null;
  if (!activeRectangle) {
    // Start a new rectangle
    activeRectangle = new RectangleEntity();
    setActiveEntity(activeRectangle);
  }
  const completed = activeRectangle.send(new Point(mousePoint.x, mousePoint.y));

  if (completed) {
    // Finish the rectangle
    setEntities([...entities, activeRectangle]);
    setActiveEntity(null);
  }
}
