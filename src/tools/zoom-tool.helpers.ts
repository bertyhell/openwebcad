import { Point } from '@flatten-js/core';
import { clamp } from 'es-toolkit';
import { DEFAULT_ZOOM_MARGIN, ZOOM_STEP_MULTIPLIER } from '../App.consts.ts';
import { calculateAngleGuidesAndSnapPoints } from '../helpers/calculate-angle-guides-and-snap-points.ts';
import { getBoundingBoxOfMultipleEntities } from '../helpers/get-bounding-box-of-multiple-entities.ts';
import { getScreenCanvasDrawController, getVisibleEntities } from '../state.ts';

/**
 * Smallest zoom level, 1 pixel on screen shows a million world units
 */
export const MIN_SCREEN_SCALE = 1e-6;

/**
 * Largest zoom level, a million pixels on screen show 1 world unit
 * Zooming in further runs into the precision of floating point numbers
 */
export const MAX_SCREEN_SCALE = 1e6;

/**
 * Whether the view can be shown at this zoom level, a zoom level of 0 or less would divide by zero
 */
export function isValidScreenScale(screenScale: number): boolean {
	return (
		Number.isFinite(screenScale) &&
		screenScale >= MIN_SCREEN_SCALE &&
		screenScale <= MAX_SCREEN_SCALE
	);
}

/**
 * Apply a new zoom level and offset
 * The drawing moved under the mouse, so the snap point under the mouse is calculated again
 */
function setView(screenScale: number, screenOffset: Point): void {
	const screenCanvasDrawController = getScreenCanvasDrawController();
	screenCanvasDrawController.setScreenScale(screenScale);
	screenCanvasDrawController.setScreenOffset(screenOffset);
	calculateAngleGuidesAndSnapPoints();
}

/**
 * Zoom in by the default zoom step multiplier, keeping the center of the screen fixed
 */
export function zoomIn() {
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const currentScreenScale = screenCanvasDrawController.getScreenScale();
	const newScreenScale = currentScreenScale * ZOOM_STEP_MULTIPLIER;
	zoomToScale(newScreenScale);
}

/**
 * Zoom out by the default zoom step multiplier, keeping the center of the screen fixed
 */
export function zoomOut() {
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const currentScreenScale = screenCanvasDrawController.getScreenScale();
	const newScreenScale = currentScreenScale / ZOOM_STEP_MULTIPLIER;
	zoomToScale(newScreenScale);
}

/**
 * Zoom to a specific scale, keeping the center of the screen fixed
 * A scale of 0 or less is ignored, a scale beyond the zoom limits is clamped to the limit
 * @param newScreenScale - The new screen scale to zoom to
 */
export function zoomToScale(newScreenScale: number) {
	// Also catches NaN, the view can't be calculated without a zoom level
	if (!(newScreenScale > 0)) {
		return;
	}
	const screenScale = clamp(newScreenScale, MIN_SCREEN_SCALE, MAX_SCREEN_SCALE);
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const canvasSize = screenCanvasDrawController.getCanvasSize();
	const currentOffset = screenCanvasDrawController.getScreenOffset();
	const currentScale = screenCanvasDrawController.getScreenScale();

	// Calculate the current center of the screen in world coordinates
	const centerWorldX = currentOffset.x + canvasSize.x / currentScale / 2;
	const centerWorldY = currentOffset.y + canvasSize.y / currentScale / 2;

	// Calculate the new offset to keep the center point at the center of the screen
	const newOffsetX = centerWorldX - canvasSize.x / screenScale / 2;
	const newOffsetY = centerWorldY - canvasSize.y / screenScale / 2;

	setView(screenScale, new Point(newOffsetX, newOffsetY));
}

export function zoomToBounds() {
	const entities = getVisibleEntities();
	if (entities.length === 0) {
		return;
	}
	const boundingBox = getBoundingBoxOfMultipleEntities(entities);
	zoomRectangle(
		new Point(boundingBox.minX, boundingBox.minY),
		new Point(boundingBox.maxX, boundingBox.maxY),
		DEFAULT_ZOOM_MARGIN
	);
}

/**
 * Zoom to fit a rectangle defined by two corner points
 * A rectangle without a width or height, eg: a horizontal line, is fitted in the direction it has a size in.
 * A single point is centered on the screen at the current zoom level
 * @param corner1 - First corner of the rectangle in world coordinates
 * @param corner2 - Second corner of the rectangle in world coordinates
 * @param margin - Margin in screen pixels to add around the rectangle (default: 0)
 */
export function zoomRectangle(corner1: Point, corner2: Point, margin = 0) {
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const canvasSize = screenCanvasDrawController.getCanvasSize();

	// Calculate the bounds of the rectangle
	const minX = Math.min(corner1.x, corner2.x);
	const maxX = Math.max(corner1.x, corner2.x);
	const minY = Math.min(corner1.y, corner2.y);
	const maxY = Math.max(corner1.y, corner2.y);

	const rectWidth = maxX - minX;
	const rectHeight = maxY - minY;
	if (!Number.isFinite(rectWidth) || !Number.isFinite(rectHeight)) {
		return;
	}

	// Calculate available canvas size after subtracting margin
	const availableWidth = Math.max(canvasSize.x - 2 * margin, 1);
	const availableHeight = Math.max(canvasSize.y - 2 * margin, 1);

	// Calculate the scale to fit the rectangle in the available canvas area, a direction without a size doesn't limit it
	const scaleX = rectWidth > 0 ? availableWidth / rectWidth : Number.POSITIVE_INFINITY;
	const scaleY = rectHeight > 0 ? availableHeight / rectHeight : Number.POSITIVE_INFINITY;
	const fittingScale = Math.min(scaleX, scaleY);
	const newScreenScale = clamp(
		Number.isFinite(fittingScale) ? fittingScale : screenCanvasDrawController.getScreenScale(),
		MIN_SCREEN_SCALE,
		MAX_SCREEN_SCALE
	);

	// Calculate the visible world dimensions at the new scale
	const visibleWorldWidth = canvasSize.x / newScreenScale;
	const visibleWorldHeight = canvasSize.y / newScreenScale;

	// Calculate the offset to center the rectangle
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const newOffsetX = centerX - visibleWorldWidth / 2;
	const newOffsetY = centerY - visibleWorldHeight / 2;

	// Apply the new scale and offset
	setView(newScreenScale, new Point(newOffsetX, newOffsetY));
}
