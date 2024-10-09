import { Entity } from '../entities/Entity.ts';
import { Circle, Point, Segment } from '@flatten-js/core';
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
  if (intersections.length === 0) {
    deleteEntity(circle);
    return;
  }

  const [firstCutPoint, secondCutPoint] = findNeighboringPointsOnCircle(
    clickedPointOnShape,
    circle,
    intersections,
  );

  const circleShape = circle.getShape() as Circle;
  const center = circleShape.center;
  
  const angles = [firstCutPoint, secondCutPoint, clickedPointOnShape].map(p => 
    Math.atan2(p.y - center.y, p.x - center.x));
  
  const [startAngle, endAngle] = isAngleBetween(angles[2], angles[0], angles[1]) 
    ? [angles[1], angles[0]] 
    : [angles[0], angles[1]];

  const newArc = new ArcEntity(center, circleShape.r, startAngle, endAngle, true);
  Object.assign(newArc, { lineColor: circle.lineColor, lineWidth: circle.lineWidth });

  deleteEntity(circle);
  addEntity(newArc);
}

function isAngleBetween(angle: number, start: number, end: number): boolean {
  const twoPi = 2 * Math.PI;
  return ((angle - start + twoPi) % twoPi) <= ((end - start + twoPi) % twoPi);
}

export function eraseArcSegment(arc: ArcEntity, clickedPointOnShape: Point, intersections: Point[]): void {
  const [first, second] = findNeighboringPointsOnArc(clickedPointOnShape, arc, intersections);

  if (isPointEqual(first, second)) {
    deleteEntity(arc);
    return;
  }

  deleteEntity(arc);
  arc.cutAtPoints([first, second])
    .filter(cutArc => !cutArc.containsPointOnShape(clickedPointOnShape))
    .forEach(newArc => {
      Object.assign(newArc, { lineColor: arc.lineColor, lineWidth: arc.lineWidth });
      addEntity(newArc);
    });
}
