import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import { LineEntity } from '../../../src/entities/LineEntity';
import type { InputController } from '../../../src/inputController/input-controller';
import {
	getActiveLayerId,
	getDimmedEntityIds,
	getEntities,
	getLayers,
	setEntities,
	setLayers,
	setSelectedEntityIds,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import {
	getToolContext,
	getToolState,
	pressEnter,
	typeNumber,
	typePoint,
	typeText,
} from './tool-events';

describe('array', () => {
	let inputController: InputController;
	let line: LineEntity;

	beforeEach(() => {
		inputController = initApplication();
		line = new LineEntity(new Point(0, 0), new Point(0, 10));
		setEntities([line], true);
		setSelectedEntityIds([line.id]);
		setActiveTool(Tool.ARRAY);
	});

	function getCopiedLineXs() {
		return getEntities()
			.slice(1)
			.map((entity) => (entity as LineEntity).getStartPoint().x);
	}

	it('makes linear copies with a typed start and end point', () => {
		pressEnter();
		typeNumber(3);
		typePoint(0, 0);

		expect(getToolState()).toBe('LINEAR_WAITING_FOR_END_POINT');

		typePoint(20, 0);
		expect(getCopiedLineXs()).toEqual([20, 40, 60]);
	});

	it('resets the start point when it starts over', () => {
		pressEnter();
		typeNumber(1);
		typePoint(0, 0);
		typePoint(20, 0);

		expect(getToolContext().startDistanceVector).toBeNull();
		expect(getToolContext().endDistanceVector).toBeNull();
	});

	it('only copies the editable entities that were selected when it started', () => {
		const lockedLayer = { id: 'locked', name: 'Locked', isVisible: true, isLocked: true };
		setLayers([...getLayers(), lockedLayer]);
		const lockedCircle = new CircleEntity(new Point(50, 50), 5);
		lockedCircle.layerId = lockedLayer.id;
		const otherLine = new LineEntity(new Point(100, 0), new Point(100, 10));
		otherLine.layerId = getActiveLayerId();
		setEntities([line, lockedCircle, otherLine], true);
		setSelectedEntityIds([line.id, lockedCircle.id]);
		setActiveTool(Tool.ARRAY);

		expect(getDimmedEntityIds()).toEqual([line.id]);

		// Selecting something else while the tool runs doesn't change what is copied
		setSelectedEntityIds([otherLine.id]);
		pressEnter();
		typeNumber(1);
		typePoint(0, 0);
		typePoint(20, 0);

		const entities = getEntities();
		expect(entities).toHaveLength(4);
		expect((entities[3] as LineEntity).getStartPoint().x).toBe(20);
	});

	it('goes back to selecting with one ESC from every prompt', () => {
		inputController.handleEscapeKey();
		expect(getToolState()).toBe('WAITING_FOR_SELECTION');

		for (const steps of [
			[() => pressEnter()],
			[() => pressEnter(), () => typeNumber(2)],
			[() => pressEnter(), () => typeNumber(2), () => typePoint(0, 0)],
			[() => typeText('R'), () => typeNumber(2)],
			[() => typeText('R'), () => typeNumber(2), () => typePoint(0, 0)],
		]) {
			setSelectedEntityIds([line.id]);
			pressEnter();
			expect(getToolState()).toBe('ASK_COPY_MODE');
			for (const step of steps) {
				step();
			}

			inputController.handleEscapeKey();

			expect(getToolState()).toBe('WAITING_FOR_SELECTION');
			expect(getDimmedEntityIds()).toEqual([]);
		}
	});

	it('refuses an unknown copy mode', () => {
		typeText('X');
		expect(getToolState()).toBe('ASK_COPY_MODE');

		typeText('l');
		expect(getToolState()).toBe('ASK_NUMBER_OF_COPIES');
	});

	it('refuses a number of copies that is not a whole number above 0', () => {
		pressEnter();
		typeNumber(2.5);
		typeNumber(0);
		typeNumber(-2);

		expect(getToolState()).toBe('ASK_NUMBER_OF_COPIES');

		typeNumber(2);
		expect(getToolState()).toBe('LINEAR_WAITING_FOR_START_POINT');
	});

	it('refuses copies on top of the originals', () => {
		pressEnter();
		typeNumber(2);
		typePoint(0, 0);
		typePoint(0, 0);

		expect(getToolState()).toBe('LINEAR_WAITING_FOR_END_POINT');
		expect(getEntities()).toHaveLength(1);
	});

	it('makes radial copies and refuses an angle of 0', () => {
		typeText('R');
		typeNumber(3);
		typePoint(0, 0);
		typeNumber(0);

		expect(getToolState()).toBe('RADIAL_WAITING_FOR_ANGLE');

		typeNumber(90);
		const endPoints = getEntities()
			.slice(1)
			.map((entity) => (entity as LineEntity).getEndPoint());
		expect(endPoints[0].x).toBeCloseTo(-10);
		expect(endPoints[0].y).toBeCloseTo(0);
		expect(endPoints[2].x).toBeCloseTo(10);
		expect(endPoints[2].y).toBeCloseTo(0);
	});
});
