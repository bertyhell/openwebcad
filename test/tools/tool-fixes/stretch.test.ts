import { Box, Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import { LineEntity } from '../../../src/entities/LineEntity';
import { MeasurementEntity } from '../../../src/entities/MeasurementEntity';
import { TextEntity } from '../../../src/entities/TextEntity';
import { stretchEntity } from '../../../src/helpers/stretch-entity';
import type { InputController } from '../../../src/inputController/input-controller';
import {
	getDimmedEntityIds,
	getEntities,
	getSelectedEntityIds,
	setEntities,
	setSelectedEntityIds,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { getToolContext, getToolState, typePoint } from './tool-events';

describe('stretch tool', () => {
	let inputController: InputController;
	let topLine: LineEntity;
	let bottomLine: LineEntity;

	beforeEach(() => {
		inputController = initApplication();
		topLine = new LineEntity(new Point(0, 10), new Point(100, 10));
		bottomLine = new LineEntity(new Point(0, 0), new Point(100, 0));
		setEntities([topLine, bottomLine], true);
	});

	function stretchRightEnds() {
		typePoint(90, -5);
		typePoint(110, 15);
		typePoint(0, 0);
		typePoint(50, 0);
	}

	function getEndX(line: LineEntity) {
		const stretchedLine = getEntities().find((entity) => entity.id === line.id) as LineEntity;
		return stretchedLine.getEndPoint().x;
	}

	it('stretches everything inside the window when nothing is selected', () => {
		setActiveTool(Tool.STRETCH);
		stretchRightEnds();

		expect(getEndX(topLine)).toBe(150);
		expect(getEndX(bottomLine)).toBe(150);
	});

	it('only stretches the entities that were selected before starting the tool', () => {
		setSelectedEntityIds([topLine.id]);
		setActiveTool(Tool.STRETCH);

		expect(getSelectedEntityIds()).toEqual([]);
		expect(getDimmedEntityIds()).toEqual([topLine.id]);

		stretchRightEnds();

		expect(getEndX(topLine)).toBe(150);
		expect(getEndX(bottomLine)).toBe(100);
	});

	it('keeps the selection made before starting when the window misses it', () => {
		setSelectedEntityIds([topLine.id]);
		setActiveTool(Tool.STRETCH);
		typePoint(200, 200);
		typePoint(300, 300);

		expect(getToolState()).toBe('WAITING_FOR_FIRST_CORNER');
		expect(getToolContext().selectedEntities).toEqual([topLine]);
	});

	it('starts over with one ESC while waiting for the base point', () => {
		setActiveTool(Tool.STRETCH);
		typePoint(90, -5);
		typePoint(110, 15);
		expect(getToolState()).toBe('WAITING_FOR_BASE_POINT');

		inputController.handleEscapeKey();

		expect(getToolState()).toBe('WAITING_FOR_FIRST_CORNER');
		expect(getActiveToolType()).toBe(Tool.STRETCH);
	});

	it('keeps the selection made before starting when ESC goes back to the window', () => {
		setSelectedEntityIds([topLine.id]);
		setActiveTool(Tool.STRETCH);
		typePoint(90, -5);
		typePoint(110, 15);
		typePoint(0, 0);

		inputController.handleEscapeKey();

		expect(getToolState()).toBe('WAITING_FOR_FIRST_CORNER');
		expect(getDimmedEntityIds()).toEqual([topLine.id]);

		stretchRightEnds();
		expect(getEndX(topLine)).toBe(150);
		expect(getEndX(bottomLine)).toBe(100);
	});

	it('moves a circle when its center is inside the window', () => {
		const circle = new CircleEntity(new Point(500, 500), 50);
		setEntities([circle], true);
		setActiveTool(Tool.STRETCH);
		typePoint(490, 490);
		typePoint(510, 510);
		typePoint(500, 500);
		typePoint(600, 500);

		expect((getEntities()[0] as CircleEntity).getCenter()).toEqual(new Point(600, 500));
	});

	function getActiveToolType() {
		return getToolContext().type;
	}
});

describe('stretchEntity', () => {
	const box = new Box(-10, -10, 10, 10);

	it('moves a text when its insertion point is inside the window', () => {
		const text = new TextEntity('A long text that ends outside the window', new Point(0, 0), {
			fontSize: 20,
		});
		const stretched = stretchEntity(text, box, 100, 0) as TextEntity;
		expect(stretched.getBasePoint()).toEqual(new Point(100, 0));
	});

	it('leaves a circle when its center is outside the window', () => {
		const circle = new CircleEntity(new Point(50, 0), 45);
		const stretched = stretchEntity(circle, box, 100, 0) as CircleEntity;
		expect(stretched.getCenter()).toEqual(new Point(50, 0));
	});

	it('moves the end of a measurement that is inside the window, so the dimension follows', () => {
		const measurement = new MeasurementEntity(
			new Point(-100, 0),
			new Point(0, 0),
			new Point(-50, -20)
		);
		measurement.lineColor = '#ff0000';
		const stretched = stretchEntity(
			measurement,
			new Box(-10, -30, 10, 10),
			50,
			0
		) as MeasurementEntity;

		const drawPoints = stretched.getDrawPoints();
		expect(drawPoints?.offsetStartPoint.x).toBeCloseTo(-100);
		expect(drawPoints?.offsetStartPoint.y).toBeCloseTo(-20);
		expect(drawPoints?.offsetEndPoint.x).toBeCloseTo(50);
		expect(drawPoints?.offsetEndPoint.y).toBeCloseTo(-20);
		expect(stretched.lineColor).toBe('#ff0000');
	});

	it('leaves a measurement when none of its points are inside the window', () => {
		const measurement = new MeasurementEntity(
			new Point(100, 0),
			new Point(200, 0),
			new Point(150, 20)
		);
		const stretched = stretchEntity(measurement, box, 50, 0) as MeasurementEntity;
		expect(stretched.getDrawPoints()?.offsetStartPoint.x).toBeCloseTo(100);
		expect(stretched.getDrawPoints()?.offsetEndPoint.x).toBeCloseTo(200);
	});
});
