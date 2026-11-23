import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import type { LineEntity } from '../../../src/entities/LineEntity';
import type { PolyLineEntity } from '../../../src/entities/PolyLineEntity';
import type { InputController } from '../../../src/inputController/input-controller';
import {
	getActiveToolActor,
	getEntities,
	getLastStateInstructions,
	getLayers,
	setEntities,
	setLayers,
	setSelectedEntityIds,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import {
	getToolState,
	getToolType,
	pressKey,
	typeCommand,
	typeText,
} from '../../input-controller/input-controller.helpers';

vi.mock('react-toastify', () => ({
	toast: Object.assign(vi.fn(), {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	}),
}));

function typePoints(inputController: InputController, ...points: string[]) {
	for (const point of points) {
		typeCommand(inputController, point);
	}
}

function getLines(): LineEntity[] {
	return getEntities().filter((entity) => entity !== circle) as LineEntity[];
}

function expectLine(line: LineEntity | undefined, start: [number, number], end: [number, number]) {
	expect(line?.getStartPoint().equalTo(new Point(...start))).toBe(true);
	expect(line?.getEndPoint().equalTo(new Point(...end))).toBe(true);
}

let circle: CircleEntity;

describe('line and polyline options', () => {
	let inputController: InputController;

	beforeEach(() => {
		vi.clearAllMocks();
		inputController = initApplication();
		setSelectedEntityIds([]);
		circle = new CircleEntity(new Point(500, 500), 10);
		setEntities([circle], true);
	});

	describe('line', () => {
		it('mentions the options in the instructions', () => {
			typePoints(inputController, '0,0');

			expect(getLastStateInstructions()).toContain('[C]lose');
			expect(getLastStateInstructions()).toContain('[U]ndo');
		});

		it('closes the shape back to the first point and finishes', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');

			pressKey(inputController, 'c');

			const lines = getLines();
			expect(lines).toHaveLength(3);
			expectLine(lines[2], [100, 100], [0, 0]);
			expect(getToolState()).toBe('WAITING_FOR_START_POINT');
			expect(inputController.getText()).toBe('');
		});

		it('types the C like other text while there is only one segment, so a command can still be typed', () => {
			typePoints(inputController, '0,0', '100,0');

			typeCommand(inputController, 'circle');

			expect(getToolType()).toBe(Tool.CIRCLE);
			expect(getLines()).toHaveLength(1);
		});

		it('does not start CIRCLE when C is typed before the line can be closed', () => {
			typePoints(inputController, '0,0', '100,0');

			typeCommand(inputController, 'c');

			expect(getToolType()).toBe(Tool.LINE);
			expect(getToolState()).toBe('WAITING_FOR_END_POINT');
			expect(toast.warn).toHaveBeenCalledWith('Invalid input: c');
			expect(getLines()).toHaveLength(1);
		});

		it('undoes the last segment and keeps drawing from the point before it', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');

			pressKey(inputController, 'u');

			expect(getLines()).toHaveLength(1);
			expect(getToolState()).toBe('WAITING_FOR_END_POINT');

			typePoints(inputController, '@0,-50');
			expectLine(getLines()[1], [100, 0], [100, -50]);
		});

		it('undoes the start point when there are no segments', () => {
			typePoints(inputController, '0,0');

			pressKey(inputController, 'u');

			expect(getToolState()).toBe('WAITING_FOR_START_POINT');
			expect(getEntities()).toEqual([circle]);
		});

		it('undoes the segments with Ctrl+Z, without bringing them back with a later undo', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');

			pressKey(inputController, 'z', { ctrlKey: true });
			expect(getLines()).toHaveLength(1);
			expect(getToolState()).toBe('WAITING_FOR_END_POINT');

			pressKey(inputController, 'z', { ctrlKey: true });
			expect(getLines()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_END_POINT');

			// Undo the start point
			pressKey(inputController, 'z', { ctrlKey: true });
			expect(getToolState()).toBe('WAITING_FOR_START_POINT');
			expect(getEntities()).toEqual([circle]);

			// Undo the previous command
			pressKey(inputController, 'z', { ctrlKey: true });
			expect(getEntities()).toEqual([]);
		});

		it('only removes the segment when something else changed since it was drawn', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');
			const renamedLayers = getLayers().map((layer) => ({ ...layer, name: 'Renamed' }));
			setLayers(renamedLayers, true, true);

			pressKey(inputController, 'u');

			expect(getLines()).toHaveLength(1);
			expect(getLayers()[0].name).toBe('Renamed');
		});

		it('keeps drawing when the segments were deleted in the meantime', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');
			pressKey(inputController, 'a', { ctrlKey: true });
			pressKey(inputController, 'Delete');

			pressKey(inputController, 'u');

			expect(getEntities()).toEqual([]);
			expect(
				getActiveToolActor()?.getSnapshot().context.startPoint.equalTo(new Point(100, 0))
			).toBe(true);
		});

		it('still accepts numbers and points next to the options', () => {
			typePoints(inputController, '0,0');
			typeText(inputController, '50');
			pressKey(inputController, 'Enter');

			expect(getLines()).toHaveLength(1);
		});
	});

	describe('polyline', () => {
		beforeEach(() => {
			setActiveTool(Tool.POLYLINE);
		});

		it('mentions the options in the instructions', () => {
			typePoints(inputController, '0,0');

			expect(getLastStateInstructions()).toContain('[C]lose');
			expect(getLastStateInstructions()).toContain('[U]ndo');
		});

		it('closes the polyline back to the first point and finishes', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');

			pressKey(inputController, 'c');

			const polyline = getEntities().at(-1) as PolyLineEntity;
			expect(polyline.numberOfSegments()).toBe(3);
			expect(polyline.entities[2].getEndPoint().equalTo(new Point(0, 0))).toBe(true);
			expect(getToolState()).toBe('WAITING_FOR_FIRST_POINT');
		});

		it('undoes the last point and keeps drawing from the point before it', () => {
			typePoints(inputController, '0,0', '100,0', '100,100');

			pressKey(inputController, 'u');

			expect(getActiveToolActor()?.getSnapshot().context.points).toHaveLength(2);
			expect(getEntities()).toEqual([circle]);
		});

		it('types the C like other text while there is only one segment', () => {
			typePoints(inputController, '0,0', '100,0');

			pressKey(inputController, 'c');

			expect(inputController.getText()).toBe('c');
			expect(getToolState()).toBe('WAITING_FOR_NEXT_POINT');

			// ENTER doesn't turn the C into the circle command
			pressKey(inputController, 'Enter');
			expect(getToolType()).toBe(Tool.POLYLINE);
			expect(toast.warn).toHaveBeenCalledWith('Invalid input: c');
		});
	});
});
