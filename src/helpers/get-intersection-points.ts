import { Entity } from '../entities/Entity';
import { Point } from '@flatten-js/core';

// TODO in the future we could optimize this by only calculating intersection points near the mouse
export function getIntersectionPoints(entities: Entity[]): Point[] {
  const intersectionPoints: Point[] = [];

  // Calculate all intersections between all entities
  for (let i = 0; i < entities.length; i++) {
    const entity1 = entities[i];
    for (let j = i; j < entities.length; j++) {
      // intersections are symmetric, so we only need to calculate them in one direction (let j = i)

      if (i === j) continue; // Do not check for intersections with yourself

      const entity2 = entities[j];
      intersectionPoints.push(...entity1.getIntersections(entity2));
    }
  }

  return intersectionPoints;
}
