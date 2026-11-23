import { Point } from '@flatten-js/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MouseButton } from '../../src/App.types';
import { activateTool } from '../../src/components/sidebar/sidebar.actions';
import { CircleEntity } from '../../src/entities/CircleEntity';
import { LineEntity } from '../../src/entities/LineEntity';
import type { InputController } from '../../src/inputController/input-controller';
import {
	getActiveToolActor,
	getEntities,
	getSelectedEntityIds,
	setEntities,
	setSelectedEntityIds,
	undo,
} from '../../src/state';
import { Tool } from '../../src/tools';
import { SelectState } from '../../src/tools/select-tool';
import { click } from '../helpers/click';
import { initApplication } from '../helpers/init-application';
import { setActiveTool } from '../helpers/set-active-tool';
import { CANVAS_HEIGHT } from '../helpers/tests.consts';
import {
	getToolState,
	getToolType,
	pressKey,
	typeCommand,
	typeText,
} from './input-controller.helpers';

vi.mock('react-toastify', () => ({
	toast: Object.assign(vi.fn(), {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	}),
}));

/**
 * Click at a world location, the test canvas maps world coordinates 1:1 with the y axis flipped
 */
function clickAt(inputController: InputController, x: number, y: number, button?: MouseButton) {
	click(inputController, x, CANVAS_HEIGHT - y, button);
}

function getSelectToolInsideActiveTool() {
	const children = getActiveToolActor()?.getSnapshot().children ?? {};
	return Object.values(children)[0] as
		| { getSnapshot: () => { value: string; context: { type: Tool } } }
		| undefined;
}

describe('keyboard and escape handling', () => {
	let inputController: InputController;
	let line: LineEntity;
	let circle: CircleEntity;

	beforeEach(() => {
		vi.clearAllMocks();
		inputController = initApplication();
		setSelectedEntityIds([]);
		line = new LineEntity(new Point(100, 100), new Point(300, 100));
		circle = new CircleEntity(new Point(600, 600), 50);
		setEntities([line, circle], true);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('ctrl and cmd shortcuts', () => {
		it('lets unhandled shortcuts through to the browser without typing them', () => {
			const copy = pressKey(inputController, 'c', { ctrlKey: true });
			const print = pressKey(inputController, 'p', { metaKey: true });

			expect(copy.defaultPrevented).toBe(false);
			expect(print.defaultPrevented).toBe(false);
			expect(inputController.getText()).toBe('');

			// Ctrl+C then ENTER used to start the circle tool
			pressKey(inputController, 'Enter');
			expect(getToolType()).toBe(Tool.LINE);
		});

		it('does not toggle the sidebar or pick tool options with ctrl', () => {
			typeCommand(inputController, 'ARC');
			typeCommand(inputController, '0,0');
			typeCommand(inputController, '100,0');
			expect(getToolState()).toBe('WAITING_FOR_END_ANGLE');

			pressKey(inputController, 'i', { ctrlKey: true });
			expect(getActiveToolActor()?.getSnapshot().context.inverted).toBe(false);

			// Window doesn't exist during tests, toggling the sidebar would throw
			expect(() => pressKey(inputController, '[', { ctrlKey: true })).not.toThrow();
		});

		it('still handles the shortcuts of the drawing', () => {
			const selectAll = pressKey(inputController, 'a', { ctrlKey: true });

			expect(selectAll.defaultPrevented).toBe(true);
			expect(getSelectedEntityIds()).toEqual([line.id, circle.id]);
		});

		it('types characters that need AltGr, which Windows reports as ctrl and alt', () => {
			typeCommand(inputController, '0,0');
			pressKey(inputController, '@', { ctrlKey: true, altKey: true });
			typeText(inputController, '10,0');

			expect(inputController.getText()).toBe('@10,0');
		});
	});

	describe('sidebar toggle', () => {
		it('types the [ when the active tool asks for text', () => {
			setActiveTool(Tool.TEXT);
			typeCommand(inputController, '0,0');
			expect(getToolState()).toBe('WAITING_FOR_LABEL');

			pressKey(inputController, '[');

			expect(inputController.getText()).toBe('[');
		});

		it('toggles the sidebar when the active tool does not ask for text', () => {
			const dispatchEvent = vi.fn();
			vi.stubGlobal('window', { dispatchEvent });

			pressKey(inputController, '[');

			expect(dispatchEvent).toHaveBeenCalledTimes(1);
			expect(inputController.getText()).toBe('');
		});
	});

	describe('escape order', () => {
		it('clears the typed text before the selection', () => {
			setActiveTool(Tool.SELECT);
			setSelectedEntityIds([line.id]);
			typeText(inputController, 'ab');

			inputController.handleEscapeKey();
			expect(inputController.getText()).toBe('');
			expect(getSelectedEntityIds()).toEqual([line.id]);

			inputController.handleEscapeKey();
			expect(getSelectedEntityIds()).toEqual([]);
		});

		it('cancels the selection window before clearing the selection', () => {
			setActiveTool(Tool.SELECT);
			setSelectedEntityIds([line.id]);
			clickAt(inputController, 1000, 1000);
			expect(getToolState()).toBe(SelectState.WAITING_FOR_SECOND_SELECT_POINT);

			inputController.handleEscapeKey();
			expect(getToolState()).toBe(SelectState.WAITING_FOR_FIRST_SELECT_POINT);
			expect(getSelectedEntityIds()).toEqual([line.id]);

			inputController.handleEscapeKey();
			expect(getSelectedEntityIds()).toEqual([]);
		});

		it('leaves a tool that has nothing to cancel even when its step has no escape', () => {
			setActiveTool(Tool.LINE);
			inputController.handleEscapeKey();

			expect(getToolType()).toBe(Tool.SELECT);
		});
	});

	describe('escape while waiting for a selection', () => {
		it.each([
			Tool.MOVE,
			Tool.COPY,
			Tool.ROTATE,
			Tool.SCALE,
			Tool.MIRROR,
			Tool.ALIGN,
			Tool.ARRAY,
			Tool.PEDIT,
			Tool.ALIGN_LEFT,
			Tool.ERASE,
		])('leaves %s', (tool) => {
			setActiveTool(tool);
			expect(getSelectToolInsideActiveTool()?.getSnapshot().context.type).toBe(Tool.SELECT);

			inputController.handleEscapeKey();

			expect(getToolType()).toBe(Tool.SELECT);
		});

		it('leaves the move tool after a move', () => {
			setSelectedEntityIds([line.id]);
			setActiveTool(Tool.MOVE);
			typeCommand(inputController, '0,0');
			typeCommand(inputController, '10,0');
			expect(getToolState()).toBe('WAITING_FOR_SELECTION');

			inputController.handleEscapeKey();

			expect(getToolType()).toBe(Tool.SELECT);
		});

		it('cancels a half drawn selection window first', () => {
			setActiveTool(Tool.MOVE);
			clickAt(inputController, 1000, 1000);
			expect(getSelectToolInsideActiveTool()?.getSnapshot().value).toBe(
				SelectState.WAITING_FOR_SECOND_SELECT_POINT
			);

			inputController.handleEscapeKey();
			expect(getToolType()).toBe(Tool.MOVE);
			expect(getSelectToolInsideActiveTool()?.getSnapshot().value).toBe(
				SelectState.WAITING_FOR_FIRST_SELECT_POINT
			);

			inputController.handleEscapeKey();
			expect(getToolType()).toBe(Tool.SELECT);
		});

		it('clears a selection that is not confirmed yet before leaving', () => {
			setActiveTool(Tool.MOVE);
			clickAt(inputController, 200, 100);
			expect(getSelectedEntityIds()).toEqual([line.id]);

			inputController.handleEscapeKey();
			expect(getSelectedEntityIds()).toEqual([]);
			expect(getToolType()).toBe(Tool.MOVE);

			inputController.handleEscapeKey();
			expect(getToolType()).toBe(Tool.SELECT);
		});
	});

	describe('enter in the select tool', () => {
		it('keeps selecting after ENTER or a right click without a last command', () => {
			setActiveTool(Tool.SELECT);

			pressKey(inputController, 'Enter');
			clickAt(inputController, 0, 0, MouseButton.Right);

			expect(getActiveToolActor()?.getSnapshot().status).toBe('active');
			expect(getToolType()).toBe(Tool.SELECT);
			clickAt(inputController, 200, 100);
			expect(getSelectedEntityIds()).toEqual([line.id]);

			// ESC still works
			inputController.handleEscapeKey();
			expect(getSelectedEntityIds()).toEqual([]);
		});

		it('repeats the last command typed on the command line', () => {
			typeCommand(inputController, 'C');
			inputController.handleEscapeKey();
			expect(getToolType()).toBe(Tool.SELECT);

			pressKey(inputController, 'Enter');

			expect(getToolType()).toBe(Tool.CIRCLE);
		});

		it('repeats the last tool started from the sidebar', () => {
			activateTool(Tool.RECTANGLE);
			inputController.handleEscapeKey();

			clickAt(inputController, 0, 0, MouseButton.Right);

			expect(getToolType()).toBe(Tool.RECTANGLE);
		});
	});

	describe('delete', () => {
		it('erases the selection from any tool in one undo step', () => {
			typeCommand(inputController, '0,0');
			pressKey(inputController, 'a', { ctrlKey: true });

			pressKey(inputController, 'Delete');

			expect(getEntities()).toEqual([]);
			expect(getSelectedEntityIds()).toEqual([]);

			undo();
			expect(getEntities()).toEqual([line, circle]);
		});

		it('erases the selection in the select tool', () => {
			setActiveTool(Tool.SELECT);
			clickAt(inputController, 200, 100);

			pressKey(inputController, 'Delete');

			expect(getEntities()).toEqual([circle]);
		});
	});
});
