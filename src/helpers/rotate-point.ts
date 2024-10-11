import { Point, Vector } from '@flatten-js/core';

export function rotatePoint(
  point: Point,
  rotateOrigin: Point,
  angle: number,
): Point {
  const vector = new Vector(rotateOrigin, point);
  const rotatedVector = vector.rotate(angle);
  return new Point(rotatedVector.x, rotatedVector.y);
}
