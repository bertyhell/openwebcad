import {Point} from '@flatten-js/core';
import {CURSOR_SIZE, GUIDE_LINE_COLOR, GUIDE_LINE_STYLE, GUIDE_LINE_WIDTH, SNAP_POINT_COLOR, SNAP_POINT_SIZE,} from '../App.consts';
import {type SnapPoint, SnapPointType} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import type {ScreenCanvasDrawController} from '../drawControllers/screenCanvas.drawController';
import type {Entity} from '../entities/Entity';
import {getLayers, isEntityHighlighted, isEntitySelected} from '../state';
import {toast} from 'react-toastify';

export function drawEntities(drawController: DrawController, entities: Entity[]) {
	for (const entity of entities) {
		const layer = getLayers().find((layer) => layer.id === entity.layerId);
		if (!layer) {
			toast.error(`Failed to find layer for entity: ${entity?.id}`);
			console.error('Failed to find layer for entity: ', entity);
			continue;
		}
		if (!layer?.isVisible) {
			continue; // Layer not visible, skip drawing
		}
		drawController.setLineStyles(
			isEntityHighlighted(entity),
			isEntitySelected(entity),
			entity.lineColor,
			entity.lineWidth,
			[]
		);
		entity.draw(drawController);
	}
}

export function drawDebugEntities(drawController: DrawController, debugEntities: Entity[]) {
	for (const debugEntity of debugEntities) {
		drawController.setLineStyles(
			isEntityHighlighted(debugEntity),
			isEntitySelected(debugEntity),
			'#FF5500',
			1,
			[]
		);
		debugEntity.draw(drawController);
	}
}

/**
 * Draw the point to which the mouse will snap when the user clicks to draw the next point
 * @param drawController
 * @param snapPointInfo
 * @param isMarked indicates that the point has been hovered lang enough to draw guides from this point
 */
export function drawSnapPoint(
	drawController: ScreenCanvasDrawController,
	snapPointInfo: SnapPoint | null,
	isMarked: boolean
) {
	if (!snapPointInfo) return;
	const snapPoint = snapPointInfo.point;
	const screenSnapPoint = drawController.worldToTarget(snapPoint);

	drawController.setLineStyles(false, false, SNAP_POINT_COLOR, 1, []);

	if (isMarked) {
		// We will draw a plus sign inside the current snap point to indicate that it is marked
		drawController.drawLineScreen(
			new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y),
			new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y)
		);
		drawController.drawLineScreen(
			new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
			new Point(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
		);
	}

	switch (snapPointInfo.type) {
		case SnapPointType.LineEndPoint:
			// Endpoint is marked with a square

			// top
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2)
			);

			// right
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			// bottom
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			// left
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			break;

		case SnapPointType.LineMidPoint:
			// Midpoint is shown with a triangle

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2)
			);
			break;

		case SnapPointType.AngleGuide:
			// Angle guide is shown with an hourglass

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2)
			);

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2)
			);
			break;

		case SnapPointType.Intersection:
			// Intersection is shown with a cross

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);

			drawController.drawLineScreen(
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);
			break;

		case SnapPointType.CircleCenter:
			// Circle center is shown with a circle
			drawController.drawArcScreen(screenSnapPoint, SNAP_POINT_SIZE / 2, 0, 2 * Math.PI, true);
			break;

		case SnapPointType.CircleCardinal:
			// Circle cardinal is shown with a diamond
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y)
			);
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y),
				new Point(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2)
			);
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y)
			);
			drawController.drawLineScreen(
				new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y),
				new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2)
			);
			break;
	}
}

export function drawHelpers(drawController: DrawController, helperEntities: Entity[]) {
	for (const entity of helperEntities) {
		drawController.setLineStyles(
			isEntityHighlighted(entity),
			isEntitySelected(entity),
			GUIDE_LINE_COLOR,
			GUIDE_LINE_WIDTH,
			GUIDE_LINE_STYLE
		);
		entity.draw(drawController);
	}
}

export function drawCursor(drawController: ScreenCanvasDrawController) {
	drawController.setLineStyles(false, false, '#FFF', 1, []);

	const screenMouseLocation = drawController.getScreenMouseLocation();

	drawController.drawLineScreen(
		new Point(screenMouseLocation.x, screenMouseLocation.y - CURSOR_SIZE),
		new Point(screenMouseLocation.x, screenMouseLocation.y + CURSOR_SIZE)
	);
	drawController.drawLineScreen(
		new Point(screenMouseLocation.x - CURSOR_SIZE, screenMouseLocation.y),
		new Point(screenMouseLocation.x + CURSOR_SIZE, screenMouseLocation.y)
	);
}
