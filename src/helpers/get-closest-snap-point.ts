import { Point } from '@flatten-js/core';
import { SnapPoint } from '../App.types';
import { pointDistance } from './distance-between-points.ts';

export function getClosestSnapPoint(
  snapPoints: SnapPoint[],
  targetPoint: Point,
): [number, SnapPoint | null] {
  let closestSnapPoint: SnapPoint | null = null;
  let closestDistance: number = Infinity;

  snapPoints.forEach(snapPoint => {
    const dist = pointDistance(snapPoint.point, targetPoint);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestSnapPoint = snapPoint;
    }
  });

  return [closestDistance, closestSnapPoint];
}
