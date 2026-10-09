import { Point } from '@flatten-js/core';
import type { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController';

/**
 * Grid lines are never closer together than this on screen, the spacing grows when zooming out
 */
const MIN_GRID_SPACING_PIXELS = 16;

/**
 * Every n-th grid line is drawn brighter
 */
const MAJOR_GRID_LINE_INTERVAL = 5;

const MINOR_GRID_LINE_COLOR = '#24221f';
const MAJOR_GRID_LINE_COLOR = '#302d29';
const AXIS_LINE_COLOR = '#45413b';

/**
 * Distance between grid lines in world units: 1, 2 or 5 times a power of 10,
 * the smallest one that is at least the minimum spacing on screen
 */
export function getGridSpacing(screenScale: number): number {
	const minWorldSpacing = MIN_GRID_SPACING_PIXELS / screenScale;
	const powerOfTen = 10 ** Math.floor(Math.log10(minWorldSpacing));
	for (const multiplier of [1, 2, 5, 10]) {
		if (powerOfTen * multiplier >= minWorldSpacing) {
			return powerOfTen * multiplier;
		}
	}
	return powerOfTen * 10;
}

export function getClosestGridPoint(point: Point, spacing: number): Point {
	return new Point(
		Math.round(point.x / spacing) * spacing,
		Math.round(point.y / spacing) * spacing
	);
}

function getLineColor(index: number): string {
	if (index === 0) {
		return AXIS_LINE_COLOR;
	}
	return index % MAJOR_GRID_LINE_INTERVAL === 0 ? MAJOR_GRID_LINE_COLOR : MINOR_GRID_LINE_COLOR;
}

/**
 * Draws the grid lines that are visible on screen, the axes through 0,0 are drawn brighter
 */
export function drawGrid(drawController: ScreenCanvasDrawController): void {
	const spacing = getGridSpacing(drawController.getScreenScale());
	const canvasSize = drawController.getCanvasSize();
	const bottomLeft = drawController.targetToWorld(new Point(0, 0));
	const topRight = drawController.targetToWorld(new Point(canvasSize.x, canvasSize.y));

	for (
		let index = Math.ceil(bottomLeft.x / spacing);
		index <= Math.floor(topRight.x / spacing);
		index++
	) {
		const screenX = drawController.worldToTarget(new Point(index * spacing, 0)).x;
		drawController.setLineStyles(false, false, getLineColor(index), 1, []);
		drawController.drawLineScreen(new Point(screenX, 0), new Point(screenX, canvasSize.y));
	}
	for (
		let index = Math.ceil(bottomLeft.y / spacing);
		index <= Math.floor(topRight.y / spacing);
		index++
	) {
		const screenY = drawController.worldToTarget(new Point(0, index * spacing)).y;
		drawController.setLineStyles(false, false, getLineColor(index), 1, []);
		drawController.drawLineScreen(new Point(0, screenY), new Point(canvasSize.x, screenY));
	}
}
