import { Point } from '@flatten-js/core';
import { getScreenOffset, getScreenZoom } from '../state.ts';

/**
 * Convert coordinates from World Space --> Screen Space
 */
export function worldToScreen(worldCoordinate: Point): Point {
  const screenOffset = getScreenOffset();
  const screenScale = getScreenZoom();
  return new Point(
    (worldCoordinate.x - screenOffset.x) * screenScale,
    (worldCoordinate.y - screenOffset.y) * screenScale,
  );
}

/**
 * Convert coordinates from Screen Space --> World Space
 */
export function screenToWorld(screenCoordinate: Point): Point {
  const screenOffset = getScreenOffset();
  const screenScale = getScreenZoom();
  return new Point(
    screenCoordinate.x / screenScale + screenOffset.x,
    screenCoordinate.y / screenScale + screenOffset.y,
  );
}
