import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { LineEntity } from '../../../src/entities/LineEntity';
import { getEntities, setEntities, setSelectedEntityIds } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { click, getToolState, typeNumber, typePoint } from './tool-events';

describe('scale', () => {
	let line: LineEntity;

	beforeEach(() => {
		initApplication();
		line = new LineEntity(new Point(10, 0), new Point(20, 0));
		setEntities([line], true);
		setSelectedEntityIds([line.id]);
		setActiveTool(Tool.SCALE);
		typePoint(0, 0);
	});

	function getLineEnd() {
		return (getEntities()[0] as LineEntity).getEndPoint();
	}

	it('does not collapse the selection into a point when the new length is 0', () => {
		typePoint(10, 0);
		click(0, 0);

		// The tool keeps waiting for a new length instead of starting over
		expect(getToolState()).toBe('WAITING_FOR_POINT_2');
		expect(getLineEnd().x).toBeCloseTo(20);
		expect(getEntities()[0].getBoundingBox().width).toBeCloseTo(10);
	});

	it('refuses a typed scale factor of 0', () => {
		typePoint(10, 0);
		typeNumber(0);

		expect(getToolState()).toBe('WAITING_FOR_POINT_2');

		typeNumber(2);
		expect(getLineEnd().x).toBeCloseTo(40);
	});

	it('refuses a reference length of 0', () => {
		typePoint(0, 0);

		expect(getToolState()).toBe('WAITING_FOR_POINT_1');
		expect(getLineEnd().x).toBeCloseTo(20);
	});
});
