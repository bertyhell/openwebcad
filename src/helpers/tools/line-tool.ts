import { Entity } from '../../entities/Entitity.ts';
import { Dispatch, SetStateAction } from 'react';
import { Point } from '@flatten-js/core';
import { LineEntity } from '../../entities/LineEntity.ts';

export function handleLineToolClick(
  activeEntity: Entity | null,
  setActiveEntity: Dispatch<SetStateAction<Entity | null>>,
  entities: Entity[],
  setEntities: Dispatch<SetStateAction<Entity[]>>,
  mousePoint: Point,
) {
  let activeLine = activeEntity as LineEntity | null;
  if (!activeLine) {
    // Start a new line
    activeLine = new LineEntity();
    setActiveEntity(activeLine);
  }
  const completed = activeLine.send(mousePoint);

  if (completed) {
    // Finish the line
    setEntities([...entities, activeLine]);

    // Start a new line from the endpoint of the last line
    activeLine = new LineEntity();
    setActiveEntity(activeLine);
    activeLine.send(new Point(mousePoint.x, mousePoint.y));
  }
}
