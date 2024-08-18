import { Point, Segment } from '@flatten-js/core';
import { findClosestEntity } from '../find-closest-entity.ts';
import { getEntities } from '../../state.ts';
import { compact } from 'es-toolkit';
import { Entity, EntityName } from '../../entities/Entitity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';

export function handleEraserToolClick(worldClickPoint: Point) {
  const closestEntity = findClosestEntity(worldClickPoint, getEntities());
  if (!closestEntity) {
    return;
  }

  const clickedPointOnLine = closestEntity.segment.start;

  // Find entities that intersect with the closest entity
  const intersections = getAllIntersectionPoints(closestEntity, getEntities());

  switch (closestEntity.entity.getType()) {
    case EntityName.Line:
      const line = closestEntity.entity as LineEntity;
      const segment = line.getShape() as Segment;
      findNeighboringPointsOnLine(clickedPointOnLine, [
        ...intersections,
        segment.start,
        segment.end,
      ]);
      break;

    case EntityName.Circle:
      break;

    case EntityName.Rectangle:
      break;

    case EntityName.SelectionRectangle:
      // Ignore selection rectangles
      break;
  }
}

function getAllIntersectionPoints(entity: Entity, entities: Entity[]): Point[] {
  // TODO see if we need to make this list unique
  return compact(
    entities.flatMap(otherEntity => {
      if (entity.id === otherEntity.id) {
        return null;
      }
      return entity.getIntersections(otherEntity);
    }),
  );
}
