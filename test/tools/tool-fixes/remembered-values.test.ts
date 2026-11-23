import { beforeEach, describe, expect, it } from 'vitest';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import {
	getInstructions,
	getToolContext,
	getToolState,
	pressEnter,
	typeNumber,
} from './tool-events';

/**
 * The remembered values are kept in module variables, so the tests in this file build on each other
 */
describe('tools remember the last typed value', () => {
	beforeEach(() => {
		initApplication();
	});

	describe('offset', () => {
		it('needs a distance before ENTER can reuse it', () => {
			setActiveTool(Tool.OFFSET);
			pressEnter();

			expect(getToolState()).toBe('WAITING_FOR_DISTANCE');
		});

		it('reuses the last distance with ENTER the next time', () => {
			setActiveTool(Tool.OFFSET);
			typeNumber(15);
			expect(getToolState()).toBe('WAITING_FOR_ENTITY');
			expect(getInstructions()).toContain('15');

			setActiveTool(Tool.OFFSET);
			expect(getInstructions()).toContain('15');
			pressEnter();

			expect(getToolState()).toBe('WAITING_FOR_ENTITY');
			expect(getToolContext().distance).toBe(15);
		});
	});

	describe('fillet and chamfer', () => {
		it('remember the radius and the distance separately', () => {
			setActiveTool(Tool.FILLET);
			typeNumber(3);
			expect(getInstructions()).toContain('3');

			setActiveTool(Tool.CHAMFER);
			expect(getToolContext().value).toBe(0);
			typeNumber(7);

			setActiveTool(Tool.FILLET);
			expect(getToolContext().value).toBe(3);
			expect(getInstructions()).toContain('3');

			setActiveTool(Tool.CHAMFER);
			expect(getToolContext().value).toBe(7);
			expect(getInstructions()).toContain('7');
		});
	});

	describe('text', () => {
		it('remembers the text height', () => {
			setActiveTool(Tool.TEXT);
			typeNumber(42);
			expect(getInstructions()).toContain('42');

			setActiveTool(Tool.TEXT);
			expect(getToolContext().height).toBe(42);
			expect(getInstructions()).toContain('42');
		});
	});
});
