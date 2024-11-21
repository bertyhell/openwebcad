import { Point, Segment } from '@flatten-js/core';
import { Entity } from '../entities/Entity';

export function findClosestEntity<EntityType = Entity>(
  worldPoint: Point,
  entities: Entity[],
): { distance: number; segment: Segment; entity: EntityType } {
  let closestEntity = null;
  let closestDistanceInfo: [number, Segment | null] = [
    Number.MAX_SAFE_INTEGER,
    null,
  ];
  entities.forEach(entity => {
    const distanceInfo = entity.distanceTo(worldPoint);
    if (!distanceInfo) return;
    if (distanceInfo[0] < closestDistanceInfo[0]) {
      closestDistanceInfo = distanceInfo;
      closestEntity = entity;
    }
  });

  return {
    distance: closestDistanceInfo[0],
    segment: closestDistanceInfo[1] as Segment,
    entity: closestEntity! as EntityType,
  };
}
