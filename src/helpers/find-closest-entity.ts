import { Point, Segment } from '@flatten-js/core';
import { Entity } from '../entities/Entitity.ts';

export function findClosestEntity(
  point: Point,
  entities: Entity[],
): [number, Segment, Entity] {
  let closestEntity = null;
  let closestDistanceInfo: [number, Segment | null] = [
    Number.MAX_SAFE_INTEGER,
    null,
  ];
  entities.forEach(entity => {
    const distanceInfo = entity.distanceTo(point);
    if (!distanceInfo) return;
    if (distanceInfo[0] < closestDistanceInfo[0]) {
      closestDistanceInfo = distanceInfo;
      closestEntity = entity;
    }
  });

  return [
    closestDistanceInfo[0],
    closestDistanceInfo[1] as Segment,
    closestEntity!,
  ];
}
