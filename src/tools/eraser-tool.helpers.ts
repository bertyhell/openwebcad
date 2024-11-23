import { Entity } from '../entities/Entity';
import { Circle, Point, Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import { LineEntity } from '../entities/LineEntity';
import { findNeighboringPointsOnLine } from '../helpers/find-neighboring-points-on-line';
import { addEntities, deleteEntities } from '../state';
import { CircleEntity } from '../entities/CircleEntity';
import { findNeighboringPointsOnCircle } from '../helpers/find-neighboring-points-on-circle';
import { isPointEqual } from '../helpers/is-point-equal';
import { ArcEntity } from '../entities/ArcEntity';
import { findNeighboringPointsOnArc } from '../helpers/find-neighboring-points-on-arc';

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

  const cutLines: Entity[] = line.cutAtPoints([firstCutPoint, secondCutPoint]);
  // Remove the segment that has the clickedPointOnShape point on it
  const remainingLines = cutLines.filter(
    line => !line.containsPointOnShape(clickedPointOnShape),
  );
  deleteEntities([line], false);

  // Helper functions should never trigger an undo state, since they can be called multiple times during one user operation
  addEntities(remainingLines, false);
}

export function eraseCircleSegment(
  circle: CircleEntity,
  clickedPointOnShape: Point,
  intersections: Point[],
): void {
  if (intersections.length === 0) {
    deleteEntities([circle], false);
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
    Math.atan2(p.y - center.y, p.x - center.x),
  );

  const [startAngle, endAngle] = isAngleBetween(angles[2], angles[0], angles[1])
    ? [angles[1], angles[0]]
    : [angles[0], angles[1]];

  const newArc = new ArcEntity(
    center,
    circleShape.r,
    startAngle,
    endAngle,
    true,
  );
  Object.assign(newArc, {
    lineColor: circle.lineColor,
    lineWidth: circle.lineWidth,
  });

  deleteEntities([circle], false);

  // Helper functions should never trigger an undo state, since they can be called multiple times during one user operation
  addEntities([newArc], false);
}

function isAngleBetween(angle: number, start: number, end: number): boolean {
  const twoPi = 2 * Math.PI;
  return (angle - start + twoPi) % twoPi <= (end - start + twoPi) % twoPi;
}

export function eraseArcSegment(
  arc: ArcEntity,
  clickedPointOnShape: Point,
  intersections: Point[],
): void {
  const [first, second] = findNeighboringPointsOnArc(
    clickedPointOnShape,
    arc,
    intersections,
  );

  if (isPointEqual(first, second)) {
    deleteEntities([arc], true);
    return;
  }

  arc
    .cutAtPoints([first, second])
    .filter(cutArc => !cutArc.containsPointOnShape(clickedPointOnShape))
    .forEach(newArc => {
      Object.assign(newArc, {
        lineColor: arc.lineColor,
        lineWidth: arc.lineWidth,
      });
      addEntities([newArc], false);
    });

  // Helper functions should never trigger an undo state, since they can be called multiple times during one user operation
  deleteEntities([arc], false);
}
