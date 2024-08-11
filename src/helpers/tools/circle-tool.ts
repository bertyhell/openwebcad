import { CircleEntity } from '../../entities/CircleEntity.ts';
import { Point } from '@flatten-js/core';
import { Entity } from '../../entities/Entitity.ts';
import { Dispatch, SetStateAction } from 'react';

export function handleCircleToolClick(
  activeEntity: Entity | null,
  setActiveEntity: Dispatch<SetStateAction<Entity | null>>,
  entities: Entity[],
  setEntities: Dispatch<SetStateAction<Entity[]>>,
  worldClickPoint: Point,
) {
  let activeCircle = activeEntity as CircleEntity | null;
  if (!activeCircle) {
    // Start a new rectangle
    activeCircle = new CircleEntity();
    setActiveEntity(activeCircle);
  }
  const completed = activeCircle.send(worldClickPoint);

  if (completed) {
    // Finish the rectangle
    setEntities([...entities, activeCircle]);
    setActiveEntity(null);
  }
}
