import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { MeasurementEntity } from '../../../src/entities/MeasurementEntity';
import { getEntities } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { typeNumber, typePoint } from './tool-events';

describe('dimlinear', () => {
	beforeEach(() => {
		initApplication();
		setActiveTool(Tool.DIMLINEAR);
	});

	function getDimensionLine() {
		const drawPoints = (getEntities()[0] as MeasurementEntity).getDrawPoints();
		if (!drawPoints) throw new Error('The measurement has no draw points');
		return [drawPoints.offsetStartPoint, drawPoints.offsetEndPoint];
	}

	it('places the dimension line at the typed distance from the measured line, on the side of the mouse', () => {
		typePoint(0, 0);
		typePoint(100, 0);
		typeNumber(20, new Point(150, 50));

		const [offsetStartPoint, offsetEndPoint] = getDimensionLine();
		expect(offsetStartPoint.x).toBeCloseTo(0);
		expect(offsetStartPoint.y).toBeCloseTo(20);
		expect(offsetEndPoint.x).toBeCloseTo(100);
		expect(offsetEndPoint.y).toBeCloseTo(20);
	});

	it('uses the side of the mouse for a slanted line', () => {
		typePoint(0, 0);
		typePoint(30, 40);
		typeNumber(10, new Point(100, 0));

		// The unit normal towards the mouse side is (0.8, -0.6)
		const [offsetStartPoint] = getDimensionLine();
		expect(offsetStartPoint.x).toBeCloseTo(8);
		expect(offsetStartPoint.y).toBeCloseTo(-6);
	});
});
