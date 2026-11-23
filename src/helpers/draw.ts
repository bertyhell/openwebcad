import { DIMMED_ENTITY_ALPHA, HOVERED_SNAP_POINT_TIME } from '../App.consts';
import type { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController';
import type { Entity } from '../entities/Entity';
import {
	getAngleGuideEntities,
	getDebugEntities,
	getDimmedEntityIds,
	getEntities,
	getGhostHelperEntities,
	getGridSettings,
	getHoveredSnapPoints,
	getInputController,
	getShouldDrawCursor,
} from '../state';
import {
	drawCursor,
	drawDebugEntities,
	drawEntities,
	drawHelpers,
	drawSnapPoint,
} from './draw-functions';
import { getActiveSnapPoint } from './get-closest-snap-point';
import { drawGrid } from './grid';
import { isPointEqual } from './is-point-equal';

/**
 * Draw the dimmed entities transparent, so the user can see where entities were before they are moved, rotated, ...
 */
function drawEntitiesWithDimming(
	drawController: ScreenCanvasDrawController,
	entities: Entity[],
	dimmedEntityIds: string[]
) {
	if (!dimmedEntityIds.length) {
		drawEntities(drawController, entities);
		return;
	}
	const dimmedIds = new Set(dimmedEntityIds);
	drawEntities(
		drawController,
		entities.filter((entity) => !dimmedIds.has(entity.id))
	);
	drawController.setGlobalAlpha(DIMMED_ENTITY_ALPHA);
	drawEntities(
		drawController,
		entities.filter((entity) => dimmedIds.has(entity.id))
	);
	drawController.setGlobalAlpha(1);
}

export function draw(drawController: ScreenCanvasDrawController) {
	drawController.clear();

	if (getGridSettings().isVisible) {
		drawGrid(drawController);
	}

	drawHelpers(drawController, getAngleGuideEntities());
	drawEntitiesWithDimming(drawController, getEntities(), getDimmedEntityIds());
	// Draw ghost entities after the real entities, so in-progress drawings stay visible on top of images
	drawEntities(drawController, getGhostHelperEntities());
	drawDebugEntities(drawController, getDebugEntities());

	// Show the snap point that a click would use
	const closestSnapPoint = getActiveSnapPoint();
	const isMarked =
		!!closestSnapPoint &&
		getHoveredSnapPoints().some(
			(hoveredSnapPoint) =>
				hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME &&
				isPointEqual(hoveredSnapPoint.snapPoint.point, closestSnapPoint.point)
		);
	drawSnapPoint(drawController, closestSnapPoint, isMarked);

	if (getShouldDrawCursor()) {
		drawCursor(drawController);
		getInputController().draw(drawController);
	}
}
