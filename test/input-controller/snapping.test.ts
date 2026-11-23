import { Point } from '@flatten-js/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TOOLBAR_WIDTH } from '../../src/App.consts';
import { type HoverPoint, MouseButton, type SnapPoint, SnapPointType } from '../../src/App.types';
import { LineEntity } from '../../src/entities/LineEntity';
import { getActiveSnapPoint } from '../../src/helpers/get-closest-snap-point';
import { getClosestGridPoint, getGridSpacing } from '../../src/helpers/grid';
import {
	forgetHoveredSnapPointsWhenToolChanges,
	isSnapPointInDrawing,
	trackHoveredSnapPoint,
} from '../../src/helpers/track-hovered-snap-points';
import type { InputController } from '../../src/inputController/input-controller';
import {
	getActiveToolActor,
	getAngleGuideEntities,
	getEntities,
	getGhostHelperEntities,
	getScreenCanvasDrawController,
	getSelectedEntityIds,
	setAngleStep,
	setEntities,
	setGridSettings,
	setSelectedEntityIds,
} from '../../src/state';
import { Tool } from '../../src/tools';
import { ActorEvent, type DrawEvent } from '../../src/tools/tool.types';
import { initApplication } from '../helpers/init-application';
import { setActiveTool } from '../helpers/set-active-tool';
import { pressKey, typeCommand } from './input-controller.helpers';

vi.mock('react-toastify', () => ({
	toast: Object.assign(vi.fn(), {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	}),
}));

/**
 * Mouse event at a location on the screen, in the coordinates of the draw controller
 */
function getMouseEventAtScreenLocation(screenLocation: Point, button = MouseButton.Left) {
	return {
		button,
		clientX: screenLocation.x + TOOLBAR_WIDTH,
		clientY: getScreenCanvasDrawController().getCanvasSize().y - screenLocation.y,
		preventDefault: () => {},
		stopPropagation: () => {},
	} as MouseEvent;
}

/**
 * The input controller passes screen locations with the y axis pointing up to the draw controller
 */
function worldToScreenLocation(x: number, y: number): Point {
	const drawController = getScreenCanvasDrawController();
	const offset = drawController.getScreenOffset();
	const scale = drawController.getScreenScale();
	return new Point((x - offset.x) * scale, (y - offset.y) * scale);
}

function moveMouseTo(inputController: InputController, x: number, y: number) {
	const screenLocation = worldToScreenLocation(x, y);
	inputController.handleMouseMove(getMouseEventAtScreenLocation(screenLocation));
	return screenLocation;
}

function clickAtScreenLocation(inputController: InputController, screenLocation: Point) {
	inputController.handleMouseUp(getMouseEventAtScreenLocation(screenLocation));
}

function sendDrawEvent() {
	getActiveToolActor()?.send({
		type: ActorEvent.DRAW,
		drawController: getScreenCanvasDrawController(),
	} as DrawEvent);
}

function expectPoint(point: Point | undefined, x: number, y: number) {
	expect(point?.x).toBeCloseTo(x);
	expect(point?.y).toBeCloseTo(y);
}

describe('snapping', () => {
	let inputController: InputController;

	beforeEach(() => {
		vi.clearAllMocks();
		inputController = initApplication();
		setSelectedEntityIds([]);
		setAngleStep(90, false);
		setGridSettings({ isVisible: true, isSnapEnabled: false });
	});

	afterEach(() => {
		setAngleStep(45, false);
		setGridSettings({ isVisible: true, isSnapEnabled: false });
	});

	describe('angle guides', () => {
		it('shows angle guides at the same distance on screen when zoomed out', () => {
			typeCommand(inputController, '0,0');
			getScreenCanvasDrawController().setScreenScale(0.1);

			// 50 world units is 5 pixels at this zoom level
			moveMouseTo(inputController, 1000, 50);

			expect(getAngleGuideEntities()).toHaveLength(1);
			expectPoint(getActiveSnapPoint()?.point, 1000, 0);
		});

		it('does not show angle guides from far away when zoomed in', () => {
			typeCommand(inputController, '0,0');
			getScreenCanvasDrawController().setScreenScale(10);

			// 5 world units is 50 pixels at this zoom level
			moveMouseTo(inputController, 100, 5);

			expect(getAngleGuideEntities()).toHaveLength(0);
		});
	});

	describe('snap priority', () => {
		beforeEach(() => {
			// An entity snap point a little further from the mouse than the horizontal angle guide
			setEntities([new LineEntity(new Point(100, 3), new Point(200, 50))], true);
			typeCommand(inputController, '0,0');
			moveMouseTo(inputController, 100, 1);
		});

		it('prefers a snap point of an entity over an angle guide', () => {
			expectPoint(getActiveSnapPoint()?.point, 100, 3);
		});

		it('ends the line preview on the snap point that a click would use', () => {
			sendDrawEvent();

			const previewLine = getGhostHelperEntities()[0] as LineEntity;
			expectPoint(previewLine.getEndPoint(), 100, 3);
		});

		it('clicks on the snap point that is shown', () => {
			clickAtScreenLocation(inputController, worldToScreenLocation(100, 1));

			const line = getEntities()[1] as LineEntity;
			expectPoint(line.getEndPoint(), 100, 3);
		});

		it('previews a move to the snap point that a click would use', () => {
			const movedLine = new LineEntity(new Point(-50, -50), new Point(-40, -50));
			setEntities([...getEntities(), movedLine], true);
			setSelectedEntityIds([movedLine.id]);
			setActiveTool(Tool.MOVE);
			typeCommand(inputController, '0,0');
			moveMouseTo(inputController, 100, 1);

			sendDrawEvent();

			const previewEntities = getGhostHelperEntities();
			const movedPreview = previewEntities.at(-1) as LineEntity;
			expectPoint(movedPreview.getStartPoint(), 50, -47);
			expect(getSelectedEntityIds()).toEqual([]);
		});

		it('types a distance towards the snap point that a click would use', () => {
			setEntities([new LineEntity(new Point(10, 100), new Point(200, 300))], true);
			setActiveTool(Tool.LINE);
			typeCommand(inputController, '0,0');
			moveMouseTo(inputController, 5, 99);

			typeCommand(inputController, '100');

			const line = getEntities()[1] as LineEntity;
			const direction = new Point(10, 100);
			const length = Math.hypot(direction.x, direction.y);
			expectPoint(line.getEndPoint(), (direction.x / length) * 100, (direction.y / length) * 100);
		});

		it('prefers an angle guide over the grid', () => {
			setEntities([], true);
			setGridSettings({ isVisible: true, isSnapEnabled: true });
			setActiveTool(Tool.LINE);
			typeCommand(inputController, '0,0');
			const screenLocation = moveMouseTo(inputController, 103, 2);

			clickAtScreenLocation(inputController, screenLocation);

			const line = getEntities()[0] as LineEntity;
			expectPoint(line.getEndPoint(), 103, 0);
		});
	});

	describe('grid snap after the view changes', () => {
		beforeEach(() => {
			setGridSettings({ isVisible: true, isSnapEnabled: true });
		});

		function getExpectedGridPoint(screenLocation: Point): Point {
			const drawController = getScreenCanvasDrawController();
			return getClosestGridPoint(
				drawController.targetToWorld(screenLocation),
				getGridSpacing(drawController.getScreenScale())
			);
		}

		it('snaps to the grid point under the mouse after panning with the arrow keys', () => {
			const screenLocation = moveMouseTo(inputController, 103, 2);
			pressKey(inputController, 'ArrowLeft');
			const expectedPoint = getExpectedGridPoint(screenLocation);

			clickAtScreenLocation(inputController, screenLocation);
			typeCommand(inputController, '@50,0');

			const line = getEntities()[0] as LineEntity;
			expect(expectedPoint.equalTo(new Point(120, 0))).toBe(true);
			expectPoint(line.getStartPoint(), expectedPoint.x, expectedPoint.y);
		});

		it('snaps to the grid point under the mouse after zooming with the keyboard', () => {
			setActiveTool(Tool.SELECT);
			const screenLocation = moveMouseTo(inputController, 333, 177);
			pressKey(inputController, '+');
			setActiveTool(Tool.LINE);
			const expectedPoint = getExpectedGridPoint(screenLocation);

			clickAtScreenLocation(inputController, screenLocation);
			typeCommand(inputController, '@50,0');

			const line = getEntities()[0] as LineEntity;
			expectPoint(line.getStartPoint(), expectedPoint.x, expectedPoint.y);
		});
	});

	describe('tracking hovered snap points', () => {
		const snapPoint = (x: number): SnapPoint => ({
			point: new Point(x, 0),
			type: SnapPointType.LineEndPoint,
		});

		function hover(hoverPoints: HoverPoint[], hoveredSnapPoint: SnapPoint | null, time = 1500) {
			let result = hoverPoints;
			trackHoveredSnapPoint(
				hoveredSnapPoint,
				hoverPoints,
				(newHoverPoints) => {
					result = newHoverPoints;
				},
				1,
				time
			);
			return result;
		}

		it('keeps marking new points after the maximum is reached, the oldest ones make room', () => {
			let hoverPoints: HoverPoint[] = [];
			for (const x of [10, 20, 30, 40, 50]) {
				hoverPoints = hover(hoverPoints, snapPoint(x));
			}

			expect(hoverPoints.map((hoverPoint) => hoverPoint.snapPoint.point.x)).toEqual([30, 40, 50]);
		});

		it('does not mark grid points', () => {
			const hoverPoints = hover([], { point: new Point(0, 0), type: SnapPointType.Grid });

			expect(hoverPoints).toEqual([]);
		});

		it('forgets points whose entity no longer exists', () => {
			const line = new LineEntity(new Point(0, 0), new Point(100, 0));
			setEntities([line], true);
			const marked: HoverPoint[] = [
				{ snapPoint: snapPoint(0), milliSecondsHovered: 2000 },
				{ snapPoint: snapPoint(55), milliSecondsHovered: 2000 },
			];
			let result = marked;

			trackHoveredSnapPoint(
				null,
				marked,
				(newHoverPoints) => {
					result = newHoverPoints;
				},
				1,
				16,
				isSnapPointInDrawing
			);

			expect(result.map((hoverPoint) => hoverPoint.snapPoint.point.x)).toEqual([0]);
		});

		it('forgets the marked points when another tool starts', () => {
			const setHoveredSnapPoints = vi.fn();
			const firstTool = {};
			const secondTool = {};

			forgetHoveredSnapPointsWhenToolChanges(firstTool, setHoveredSnapPoints);
			forgetHoveredSnapPointsWhenToolChanges(firstTool, setHoveredSnapPoints);
			expect(setHoveredSnapPoints).toHaveBeenCalledTimes(1);

			forgetHoveredSnapPointsWhenToolChanges(secondTool, setHoveredSnapPoints);
			expect(setHoveredSnapPoints).toHaveBeenCalledTimes(2);
			expect(setHoveredSnapPoints).toHaveBeenLastCalledWith([]);
		});
	});
});
