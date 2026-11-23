import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LineEntity } from '../../src/entities/LineEntity';
import type { InputController } from '../../src/inputController/input-controller';
import { getEntities, setSelectedEntityIds } from '../../src/state';
import { Tool } from '../../src/tools';
import { initApplication } from '../helpers/init-application';
import { setActiveTool } from '../helpers/set-active-tool';
import { getToolState, getToolType, typeCommand } from './input-controller.helpers';

vi.mock('react-toastify', () => ({
	toast: Object.assign(vi.fn(), {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	}),
}));

describe('command line', () => {
	let inputController: InputController;

	beforeEach(() => {
		vi.clearAllMocks();
		inputController = initApplication();
		setSelectedEntityIds([]);
	});

	describe('unknown commands', () => {
		it('does not run a command whose name starts with the typed text', () => {
			typeCommand(inputController, 'D');

			expect(getToolType()).toBe(Tool.LINE);
			expect(toast.warn).toHaveBeenCalledWith('Unknown command: D');
		});

		it('keeps the command that is in progress', () => {
			typeCommand(inputController, '0,0');
			typeCommand(inputController, 'xyz');

			expect(getToolType()).toBe(Tool.LINE);
			expect(getToolState()).toBe('WAITING_FOR_END_POINT');
			expect(toast.warn).toHaveBeenCalledWith('Unknown command: xyz');

			typeCommand(inputController, '100,0');
			expect(getEntities()).toHaveLength(1);
		});

		it('still runs exact command names and aliases', () => {
			typeCommand(inputController, 'circle');
			expect(getToolType()).toBe(Tool.CIRCLE);

			typeCommand(inputController, 'dli');
			expect(getToolType()).toBe(Tool.DIMLINEAR);
			expect(toast.warn).not.toHaveBeenCalled();
		});

		it('tells the user when the active tool can not use the typed input', () => {
			setActiveTool(Tool.SELECT);
			typeCommand(inputController, '100');
			expect(toast.warn).toHaveBeenCalledWith('Invalid input: 100');

			setActiveTool(Tool.LINE);
			typeCommand(inputController, '@10,10');
			expect(toast.warn).toHaveBeenCalledWith('Invalid input: @10,10');
			expect(getToolState()).toBe('WAITING_FOR_START_POINT');
		});
	});

	describe('polar input', () => {
		it('draws a line to a point at a distance and angle from the last point', () => {
			typeCommand(inputController, '10,10');
			typeCommand(inputController, '@100<90');

			const line = getEntities()[0] as LineEntity;
			expect(line.getStartPoint().equalTo(new Point(10, 10))).toBe(true);
			expect(line.getEndPoint().equalTo(new Point(10, 110))).toBe(true);
		});

		it('picks a point at a distance and angle from the origin', () => {
			typeCommand(inputController, '50<180');
			typeCommand(inputController, '0,0');

			const line = getEntities()[0] as LineEntity;
			expect(line.getStartPoint().equalTo(new Point(-50, 0))).toBe(true);
		});
	});
});
