import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntityName } from '../../../src/entities/Entity';
import { LineEntity } from '../../../src/entities/LineEntity';
import { getEntities, setEntities } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { click, getToolContext, getToolState, typeNumber } from './tool-events';

describe('fillet', () => {
	let firstLine: LineEntity;
	let parallelLine: LineEntity;
	let verticalLine: LineEntity;

	beforeEach(() => {
		initApplication();
		firstLine = new LineEntity(new Point(0, 0), new Point(100, 0));
		parallelLine = new LineEntity(new Point(0, 20), new Point(100, 20));
		verticalLine = new LineEntity(new Point(120, -50), new Point(120, 50));
		setEntities([firstLine, parallelLine, verticalLine], true);
		setActiveTool(Tool.FILLET);
	});

	it('keeps the first line when the second line gives an error', () => {
		typeNumber(5);
		click(50, 0);
		click(50, 20);

		expect(getToolState()).toBe('WAITING_FOR_SECOND_LINE');
		expect(getToolContext().firstLine?.entity.id).toBe(firstLine.id);
		expect(getEntities()).toHaveLength(3);

		click(120, -30);
		expect(getToolState()).toBe('WAITING_FOR_FIRST_LINE');
		expect(getEntities().filter((entity) => entity.getType() === EntityName.Arc)).toHaveLength(1);
	});

	it('keeps the first line when the radius is too large for the second line', () => {
		typeNumber(500);
		click(50, 0);
		click(120, -30);

		expect(getToolState()).toBe('WAITING_FOR_SECOND_LINE');
		expect(getEntities()).toEqual([firstLine, parallelLine, verticalLine]);
	});
});
