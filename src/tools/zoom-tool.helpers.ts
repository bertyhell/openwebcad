import { Point } from '@flatten-js/core';
import { DEFAULT_ZOOM_MARGIN, ZOOM_STEP_MULTIPLIER } from '../App.consts.ts';
import { getBoundingBoxOfMultipleEntities } from '../helpers/get-bounding-box-of-multiple-entities.ts';
import { getEntities, getScreenCanvasDrawController } from '../state.ts';

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
 * @param newScreenScale - The new screen scale to zoom to
 */
export function zoomToScale(newScreenScale: number) {
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const canvasSize = screenCanvasDrawController.getCanvasSize();
	const currentOffset = screenCanvasDrawController.getScreenOffset();
	const currentScale = screenCanvasDrawController.getScreenScale();

	// Calculate the current center of the screen in world coordinates
	const centerWorldX = currentOffset.x + canvasSize.x / currentScale / 2;
	const centerWorldY = currentOffset.y + canvasSize.y / currentScale / 2;

	// Calculate the new offset to keep the center point at the center of the screen
	const newOffsetX = centerWorldX - canvasSize.x / newScreenScale / 2;
	const newOffsetY = centerWorldY - canvasSize.y / newScreenScale / 2;

	screenCanvasDrawController.setScreenScale(newScreenScale);
	screenCanvasDrawController.setScreenOffset(new Point(newOffsetX, newOffsetY));
}

export function zoomToBounds() {
	const entities = getEntities();
	const boundingBox = getBoundingBoxOfMultipleEntities(entities);
	zoomRectangle(
		new Point(boundingBox.minX, boundingBox.minY),
		new Point(boundingBox.maxX, boundingBox.maxY),
		DEFAULT_ZOOM_MARGIN
	);
}

/**
 * Zoom to fit a rectangle defined by two corner points
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

	// Handle edge case of zero dimensions
	if (rectWidth === 0 || rectHeight === 0) {
		return;
	}

	// Calculate available canvas size after subtracting margin
	const availableWidth = Math.max(canvasSize.x - 2 * margin, 1);
	const availableHeight = Math.max(canvasSize.y - 2 * margin, 1);

	// Calculate the scale to fit the rectangle in the available canvas area
	const scaleX = availableWidth / rectWidth;
	const scaleY = availableHeight / rectHeight;
	const newScreenScale = Math.min(scaleX, scaleY);

	// Calculate the visible world dimensions at the new scale
	const visibleWorldWidth = canvasSize.x / newScreenScale;
	const visibleWorldHeight = canvasSize.y / newScreenScale;

	// Calculate the offset to center the rectangle
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const newOffsetX = centerX - visibleWorldWidth / 2;
	const newOffsetY = centerY - visibleWorldHeight / 2;

	// Apply the new scale and offset
	screenCanvasDrawController.setScreenScale(newScreenScale);
	screenCanvasDrawController.setScreenOffset(new Point(newOffsetX, newOffsetY));
}
