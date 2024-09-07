import { Box, Point, Segment } from '@flatten-js/core';
import { findClosestEntity } from '../find-closest-entity.ts';
import {
  addEntity,
  deleteEntity,
  getEntities,
  setActiveEntity,
  setActiveTool,
  setDebugEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../../state.ts';
import { compact } from 'es-toolkit';
import { Entity, EntityName } from '../../entities/Entity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { findNeighboringPointsOnLine } from '../find-neighboring-points-on-line.ts';
import { PointEntity } from '../../entities/PointEntity.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import { RectangleEntity } from '../../entities/RectangleEntity.ts';
import { findNeighboringPointsOnCircle } from '../find-neighboring-points-on-circle.ts';
import { isPointEqual } from '../is-point-equal.ts';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import { findNeighboringPointsOnArc } from '../find-neighboring-points-on-arc.ts';
import { ToolHandler } from './tool.types.ts';
import { Tool } from '../../tools.ts';

export const eraseToolHandler: ToolHandler = {
  handleToolActivate: () => {
    setActiveTool(Tool.Eraser);
    setShouldDrawHelpers(false);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (worldClickPoint: Point) => {
    const closestEntity = findClosestEntity(worldClickPoint, getEntities());
    if (!closestEntity) {
      return;
    }

    const clickedPointOnShape = closestEntity.segment.start;

    // Find entities that intersect with the closest entity
    const intersections = getAllIntersectionPoints(
      closestEntity.entity,
      getEntities(),
    );

    switch (closestEntity.entity.getType()) {
      case EntityName.Line: {
        const line = closestEntity.entity as LineEntity;
        eraseLineSegment(line, clickedPointOnShape, intersections);
        break;
      }

      case EntityName.Circle: {
        const circle = closestEntity.entity as CircleEntity;
        eraseCircleSegment(circle, clickedPointOnShape, intersections);
        break;
      }

      case EntityName.Arc: {
        const arc = closestEntity.entity as ArcEntity;
        eraseArcSegment(arc, clickedPointOnShape, intersections);
        break;
      }

      case EntityName.Rectangle: {
        const rectangle = closestEntity.entity as RectangleEntity;
        const rectangleShape = rectangle.getShape() as Box;
        const segments = rectangleShape.toSegments();
        const segmentEntities = segments.map(
          segment => new LineEntity(segment),
        );
        // Replace rectangle with its line segments in the entities array
        deleteEntity(rectangle);
        addEntity(...segmentEntities);

        segmentEntities.forEach(segmentEntity =>
          eraseLineSegment(segmentEntity, clickedPointOnShape, intersections),
        );
        break;
      }

      case EntityName.SelectionRectangle:
        // Ignore selection rectangles
        break;
    }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('move tool typed command:', command);
  },
};

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

function eraseLineSegment(
  line: LineEntity,
  clickedPointOnShape: Point,
  intersections: Point[],
): void {
  const segment = line.getShape() as Segment;
  const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnLine(
    clickedPointOnShape,
    segment.start,
    segment.end,
    intersections,
  );

  setDebugEntities(
    [firstCutPoint, secondCutPoint].map(point => new PointEntity(point)),
  );

  const cutLines: Entity[] = line.cutAtPoints([firstCutPoint, secondCutPoint]);
  // Remove the segment that has the clickedPointOnShape point on it
  const remainingLines = cutLines.filter(
    line => !line.containsPointOnShape(clickedPointOnShape),
  );
  deleteEntity(line);
  addEntity(...remainingLines);
}

function eraseCircleSegment(
  circle: CircleEntity,
  clickedPointOnShape: Point,
  intersections: Point[],
): void {
  const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnCircle(
    clickedPointOnShape,
    circle,
    intersections,
  );

  setDebugEntities(
    [firstCutPoint, secondCutPoint].map(point => new PointEntity(point)),
  );

  const cutArcs: Entity[] = circle.cutAtPoints([firstCutPoint, secondCutPoint]);

  // Remove the arc segment that has the clickedPointOnShape point on it
  if (isPointEqual(firstCutPoint, secondCutPoint)) {
    // If one one intersection, delete the whole circle
    deleteEntity(circle);
  } else {
    // Delete segment that contains the click point
    const remainingArcs = cutArcs.filter(
      arc => !arc.containsPointOnShape(clickedPointOnShape),
    );
    deleteEntity(circle);
    addEntity(...remainingArcs);
  }
}

function eraseArcSegment(
  arc: ArcEntity,
  clickedPointOnShape: Point,
  intersections: Point[],
): void {
  const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnArc(
    clickedPointOnShape,
    arc,
    intersections,
  );

  setDebugEntities(
    [firstCutPoint, secondCutPoint].map(point => new PointEntity(point)),
  );

  const cutArcs: Entity[] = arc.cutAtPoints([firstCutPoint, secondCutPoint]);

  // Remove the arc segment that has the clickedPointOnShape point on it
  if (isPointEqual(firstCutPoint, secondCutPoint)) {
    // If one one intersection, delete the whole circle
    deleteEntity(arc);
  } else {
    // Delete segment that contains the click point
    const remainingArcs = cutArcs.filter(
      arc => !arc.containsPointOnShape(clickedPointOnShape),
    );
    deleteEntity(arc);
    addEntity(...remainingArcs);
  }
}
