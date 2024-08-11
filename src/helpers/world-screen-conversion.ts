import { Point } from '@flatten-js/core';

/**
 * Convert coordinates from World Space --> Screen Space
 */
export function worldToScreen(
  worldCoordinate: Point,
  screenOffset: Point,
  screenScale: number,
): Point {
  return new Point(
    (worldCoordinate.x - screenOffset.x) * screenScale,
    (worldCoordinate.y - screenOffset.y) * screenScale,
  );
}

/**
 * Convert coordinates from Screen Space --> World Space
 */
export function screenToWorld(
  screenCoordinate: Point,
  screenOffset: Point,
  screenScale: number,
): Point {
  return new Point(
    screenCoordinate.x / screenScale + screenOffset.x,
    screenCoordinate.y / screenScale + screenOffset.y,
  );
}
