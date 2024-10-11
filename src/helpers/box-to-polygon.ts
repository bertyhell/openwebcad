import { Box, Point, Polygon } from '@flatten-js/core';

export function boxToPolygon(box: Box): Polygon {
  return new Polygon([
    new Point(Math.min(box.low.x, box.high.x), Math.min(box.low.y, box.high.y)),
    new Point(Math.min(box.low.x, box.high.x), Math.max(box.low.y, box.high.y)),
    new Point(Math.max(box.low.x, box.high.x), Math.max(box.low.y, box.high.y)),
    new Point(Math.max(box.low.x, box.high.x), Math.min(box.low.y, box.high.y)),
  ]);
}

export function twoPointBoxToPolygon(first: Point, second: Point): Polygon {
  return new Polygon([
    new Point(Math.min(first.x, second.x), Math.min(first.y, second.y)),
    new Point(Math.min(first.x, second.x), Math.max(first.y, second.y)),
    new Point(Math.max(first.x, second.x), Math.max(first.y, second.y)),
    new Point(Math.max(first.x, second.x), Math.min(first.y, second.y)),
  ]);
}
