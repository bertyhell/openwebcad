import { Point } from '@flatten-js/core';
import { EPSILON } from '../App.consts';

export function isPointEqual(point1: Point, point2: Point): boolean {
  return (
    Math.abs(point1.x - point2.x) < EPSILON &&
    Math.abs(point1.y - point2.y) < EPSILON
  );
}
