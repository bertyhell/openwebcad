import { Entity } from '../entities/Entity.ts';
import { Point, Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import { LineEntity } from '../entities/LineEntity.ts';
import { findNeighboringPointsOnLine } from '../helpers/find-neighboring-points-on-line.ts';
import { addEntity, deleteEntity, setDebugEntities } from '../state.ts';
import { PointEntity } from '../entities/PointEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { findNeighboringPointsOnCircle } from '../helpers/find-neighboring-points-on-circle.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { findNeighboringPointsOnArc } from '../helpers/find-neighboring-points-on-arc.ts';

export function getAllIntersectionPoints(
  entity: Entity,
  entities: Entity[],
): Point[] {
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

export function eraseLineSegment(
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

export function eraseCircleSegment(
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

export function eraseArcSegment(
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
