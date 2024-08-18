import { Point, Segment } from '@flatten-js/core';
import { findClosestEntity } from '../find-closest-entity.ts';
import { getEntities, setDebugEntities, setEntities } from '../../state.ts';
import { compact } from 'es-toolkit';
import { Entity, EntityName } from '../../entities/Entitity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { findNeighboringPointsOnLine } from '../find-neighboring-points-on-line.ts';
import { PointEntity } from '../../entities/PointEntity.ts';

export function handleEraserToolClick(worldClickPoint: Point) {
  const closestEntity = findClosestEntity(worldClickPoint, getEntities());
  if (!closestEntity) {
    return;
  }

  const clickedPointOnLine = closestEntity.segment.start;

  // Find entities that intersect with the closest entity
  const intersections = getAllIntersectionPoints(
    closestEntity.entity,
    getEntities(),
  );

  switch (closestEntity.entity.getType()) {
    case EntityName.Line: {
      const line = closestEntity.entity as LineEntity;
      const segment = line.getShape() as Segment;
      const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnLine(
        clickedPointOnLine,
        segment.start,
        segment.end,
        intersections,
      );

      setDebugEntities(
        [firstCutPoint, secondCutPoint].map(point => new PointEntity(point)),
      );

      const cutLines: Entity[] = line.cutAtPoints([
        firstCutPoint,
        secondCutPoint,
      ]);
      // Remove the segment that has the clickedPointOnLine on it
      const remainingLines = cutLines.filter(
        line => !line.containsPoint(clickedPointOnLine),
      );
      setEntities([
        ...getEntities().filter(
          entity => entity.id !== closestEntity.entity.id,
        ),
        ...remainingLines,
      ]);
      break;
    }

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
