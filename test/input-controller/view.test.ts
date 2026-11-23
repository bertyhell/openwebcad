import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ZOOM_MARGIN, TOOLBAR_WIDTH } from '../../src/App.consts';
import { MouseButton } from '../../src/App.types';
import { LineEntity } from '../../src/entities/LineEntity';
import { PointEntity } from '../../src/entities/PointEntity';
import type { InputController } from '../../src/inputController/input-controller';
import {
	getAngleGuideEntities,
	getPanStartLocation,
	getScreenCanvasDrawController,
	getShouldDrawHelpers,
	setEntities,
	setPanStartLocation,
	setSelectedEntityIds,
} from '../../src/state';
import { Tool } from '../../src/tools';
import {
	MAX_SCREEN_SCALE,
	MIN_SCREEN_SCALE,
	zoomRectangle,
	zoomToScale,
} from '../../src/tools/zoom-tool.helpers';
import { initApplication } from '../helpers/init-application';
import { setActiveTool } from '../helpers/set-active-tool';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../helpers/tests.consts';
import { getToolType, pressKey, typeCommand } from './input-controller.helpers';

vi.mock('react-toastify', () => ({
	toast: Object.assign(vi.fn(), {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	}),
}));

function mouseEvent(button: MouseButton, x: number, y: number, buttons?: number): MouseEvent {
	return {
		button,
		buttons,
		clientX: TOOLBAR_WIDTH + x,
		clientY: y,
		preventDefault: () => {},
		stopPropagation: () => {},
	} as MouseEvent;
}

function getView() {
	const drawController = getScreenCanvasDrawController();
	return { scale: drawController.getScreenScale(), offset: drawController.getScreenOffset() };
}

/**
 * World location at the center of the screen
 */
function getViewCenter(): Point {
	const { scale, offset } = getView();
	return new Point(offset.x + CANVAS_WIDTH / scale / 2, offset.y + CANVAS_HEIGHT / scale / 2);
}

describe('view', () => {
	let inputController: InputController;

	beforeEach(() => {
		vi.clearAllMocks();
		inputController = initApplication();
		setSelectedEntityIds([]);
		setPanStartLocation(null);
	});

	describe('middle mouse pan', () => {
		it('stops panning when the button is released outside the canvas', () => {
			inputController.handleMouseDown(mouseEvent(MouseButton.Middle, 100, 100));
			expect(getPanStartLocation()).not.toBeNull();

			// The canvas doesn't get the mouseup when the mouse is above the sidebar, the window does
			inputController.handleWindowMouseUp(mouseEvent(MouseButton.Middle, -50, 100));

			expect(getPanStartLocation()).toBeNull();
		});

		it('stops panning when the mouse moves without the button held', () => {
			inputController.handleMouseDown(mouseEvent(MouseButton.Middle, 100, 100));
			const offsetBefore = getView().offset;

			inputController.handleMouseMove(mouseEvent(MouseButton.Left, 200, 200, 0));

			expect(getPanStartLocation()).toBeNull();
			expect(getView().offset.equalTo(offsetBefore)).toBe(true);
		});

		it('keeps panning while the button is held', () => {
			inputController.handleMouseDown(mouseEvent(MouseButton.Middle, 100, 100));
			const offsetBefore = getView().offset;

			inputController.handleMouseMove(mouseEvent(MouseButton.Left, 200, 200, 4));

			expect(getPanStartLocation()).not.toBeNull();
			expect(getView().offset.equalTo(offsetBefore)).toBe(false);
		});
	});

	describe('zoom tool', () => {
		it('removes the angle guides of the previous tool', () => {
			typeCommand(inputController, '0,0');
			inputController.handleMouseMove(mouseEvent(MouseButton.Left, 200, CANVAS_HEIGHT - 2));
			expect(getAngleGuideEntities().length).toBeGreaterThan(0);

			typeCommand(inputController, 'Z');

			expect(getToolType()).toBe(Tool.ZOOM);
			expect(getShouldDrawHelpers()).toBe(false);
			expect(getAngleGuideEntities()).toEqual([]);
		});

		it('refuses a zoom level of 0', () => {
			typeCommand(inputController, 'Z');
			typeCommand(inputController, '0');

			expect(getView().scale).toBe(1);
			expect(Number.isFinite(getView().offset.x)).toBe(true);
			expect(toast.warn).toHaveBeenCalledWith('Invalid input: 0');
		});

		it('still zooms to a percentage', () => {
			typeCommand(inputController, 'Z');
			typeCommand(inputController, '50');

			expect(getView().scale).toBe(0.5);
		});
	});

	describe('zoom limits', () => {
		it('ignores a zoom level of 0 or less', () => {
			zoomToScale(0);
			zoomToScale(-2);
			zoomToScale(Number.NaN);

			expect(getView().scale).toBe(1);
			expect(Number.isFinite(getView().offset.x)).toBe(true);
		});

		it('clamps the zoom level to the limits', () => {
			zoomToScale(1e12);
			expect(getView().scale).toBe(MAX_SCREEN_SCALE);

			zoomToScale(1e-12);
			expect(getView().scale).toBe(MIN_SCREEN_SCALE);
		});

		it('stops zooming in with the mouse wheel at the limit', () => {
			zoomToScale(MAX_SCREEN_SCALE);

			inputController.handleMouseWheel({ deltaY: -100 } as WheelEvent);

			expect(getView().scale).toBe(MAX_SCREEN_SCALE);
		});

		it('stops zooming out with the mouse wheel at the limit', () => {
			zoomToScale(MIN_SCREEN_SCALE);

			inputController.handleMouseWheel({ deltaY: 100 } as WheelEvent);

			expect(getView().scale).toBe(MIN_SCREEN_SCALE);
		});

		it('still zooms with the mouse wheel within the limits', () => {
			inputController.handleMouseWheel({ deltaY: -100 } as WheelEvent);

			expect(getView().scale).toBeGreaterThan(1);
		});
	});

	describe('zoom to the whole drawing', () => {
		it('fits a single horizontal line', () => {
			setEntities([new LineEntity(new Point(0, 0), new Point(100, 0))], true);

			pressKey(inputController, 'Home');

			expect(getView().scale).toBeCloseTo((CANVAS_WIDTH - 2 * DEFAULT_ZOOM_MARGIN) / 100);
			expect(getViewCenter().x).toBeCloseTo(50);
			expect(getViewCenter().y).toBeCloseTo(0);
		});

		it('fits a single vertical line', () => {
			setEntities([new LineEntity(new Point(10, 0), new Point(10, 100))], true);

			pressKey(inputController, 'Home');

			expect(getView().scale).toBeCloseTo((CANVAS_HEIGHT - 2 * DEFAULT_ZOOM_MARGIN) / 100);
			expect(getViewCenter().x).toBeCloseTo(10);
			expect(getViewCenter().y).toBeCloseTo(50);
		});

		it('centers a single point at the current zoom level', () => {
			setEntities([new PointEntity(new Point(500, -300))], true);

			pressKey(inputController, 'Home');

			expect(getView().scale).toBe(1);
			expect(getViewCenter().x).toBeCloseTo(500);
			expect(getViewCenter().y).toBeCloseTo(-300);
		});

		it('zooms to a rectangle that is picked on the screen', () => {
			zoomRectangle(new Point(0, 0), new Point(200, 100));

			expect(getView().scale).toBeCloseTo(Math.min(CANVAS_WIDTH / 200, CANVAS_HEIGHT / 100));
		});
	});

	it('leaves the zoom tool with escape', () => {
		setActiveTool(Tool.ZOOM);
		inputController.handleEscapeKey();
		expect(getToolType()).toBe(Tool.SELECT);
	});
});
