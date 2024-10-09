import { Point, Vector } from '@flatten-js/core';

export function scalePoint(
  point: Point,
  scaleOrigin: Point,
  scaleFactor: number,
): Point {
  const vector = new Vector(scaleOrigin, point);
  const scaledVector = vector.scale(scaleFactor, scaleFactor);
  return new Point(point.x + scaledVector.x, point.y + scaledVector.y);
}
