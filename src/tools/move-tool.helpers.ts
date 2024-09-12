import { Point } from '@flatten-js/core';
import { getEntities, getSelectedEntityIds, setEntities } from '../state.ts';

export function moveSelection(startPoint: Point, endPoint: Point) {
  // Move selected entities from start point to end point
  const movedEntities = getEntities().map(entity => {
    if (getSelectedEntityIds().includes(entity.id)) {
      return entity.move(
        endPoint.x - startPoint!.x,
        endPoint.y - startPoint!.y,
      );
    }
    return entity;
  });
  setEntities(movedEntities);
}
