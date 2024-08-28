import { Point } from '@flatten-js/core';
import { LineEntity } from '../../entities/LineEntity.ts';
import {
  getActiveEntity,
  getActiveLineColor,
  getActiveLineWidth,
  getEntities,
  setActiveEntity,
  setEntities,
} from '../../state.ts';

export function handleLineToolClick(worldClickPoint: Point) {
  const entities = getEntities();
  const activeEntity = getActiveEntity();

  let activeLine = activeEntity as LineEntity | null;
  if (!activeLine) {
    // Start a new line
    activeLine = new LineEntity();
    activeLine.lineColor = getActiveLineColor();
    activeLine.lineWidth = getActiveLineWidth();
    setActiveEntity(activeLine);
  }
  const completed = activeLine.send(worldClickPoint);

  if (completed) {
    // Finish the line
    setEntities([...entities, activeLine]);

    // Start a new line from the endpoint of the last line
    activeLine = new LineEntity();
    activeLine.lineColor = getActiveLineColor();
    activeLine.lineWidth = getActiveLineWidth();
    setActiveEntity(activeLine);
    activeLine.send(worldClickPoint);
  }
}
