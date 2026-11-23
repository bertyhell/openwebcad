import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ArcEntity } from '../../../src/entities/ArcEntity';
import type { CircleEntity } from '../../../src/entities/CircleEntity';
import type { SplineEntity } from '../../../src/entities/SplineEntity';
import { getEntities } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import {
	click,
	getToolState,
	pressEnter,
	typeNumber,
	typePoint,
	typeRelativePoint,
	typeText,
} from './tool-events';

describe('tools refuse to create zero size entities', () => {
	beforeEach(() => {
		initApplication();
	});

	describe('circle', () => {
		beforeEach(() => {
			setActiveTool(Tool.CIRCLE);
		});

		it('refuses a point on the circle that is on the center', () => {
			click(10, 10);
			click(10, 10);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_POINT_ON_CIRCLE');

			typeRelativePoint(0, 0);
			expect(getEntities()).toHaveLength(0);

			click(20, 10);
			expect(getEntities()).toHaveLength(1);
			expect((getEntities()[0] as CircleEntity).getRadius()).toBeCloseTo(10);
		});

		it('refuses a typed radius of 0 or less', () => {
			typePoint(0, 0);
			typeNumber(0);
			typeNumber(-5);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_POINT_ON_CIRCLE');

			typeNumber(5);
			expect((getEntities()[0] as CircleEntity).getRadius()).toBeCloseTo(5);
		});

		it('refuses a second point on the first point in the 3 point mode', () => {
			typeText('T');
			typePoint(0, 0);
			typePoint(0, 0);

			expect(getToolState()).toBe('WAITING_FOR_SECOND_POINT');

			typePoint(10, 0);
			typePoint(10, 0);
			expect(getToolState()).toBe('WAITING_FOR_THIRD_POINT');
			expect(getEntities()).toHaveLength(0);

			typePoint(5, 5);
			expect(getEntities()).toHaveLength(1);
			// Go back to the center and radius mode for the other tests
			typeText('C');
		});
	});

	describe('arc', () => {
		beforeEach(() => {
			setActiveTool(Tool.ARC);
			typePoint(0, 0);
		});

		it('refuses a start point on the center', () => {
			typePoint(0, 0);
			typeNumber(0);
			typeNumber(-10);

			expect(getToolState()).toBe('WAITING_FOR_START_POINT');

			typePoint(10, 0);
			expect(getToolState()).toBe('WAITING_FOR_END_ANGLE');
		});

		it('refuses an end point on the start ray or on the center', () => {
			typePoint(10, 0);
			typePoint(20, 0);
			typePoint(0, 0);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_END_ANGLE');

			typePoint(0, 10);
			expect(getEntities()).toHaveLength(1);
		});

		it('refuses a typed arc angle of 0 or a full circle', () => {
			typePoint(10, 0);
			typeNumber(0);
			typeNumber(360);
			typeNumber(-720);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_END_ANGLE');

			typeNumber(90);
			expect(getEntities()).toHaveLength(1);
			const arc = getEntities()[0] as ArcEntity;
			expect(arc.getEndPoint().x).toBeCloseTo(0);
			expect(arc.getEndPoint().y).toBeCloseTo(10);
		});
	});

	describe('polygon', () => {
		beforeEach(() => {
			setActiveTool(Tool.POLYGON);
			typePoint(0, 0);
		});

		it('refuses a radius of 0', () => {
			typePoint(0, 0);
			typeNumber(0);
			typeNumber(-10);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_RADIUS');

			typeNumber(10);
			expect(getEntities()).toHaveLength(1);
			expect(getToolState()).toBe('WAITING_FOR_CENTER');
		});
	});

	describe('star', () => {
		beforeEach(() => {
			setActiveTool(Tool.STAR);
			typePoint(0, 0);
		});

		it('refuses a first radius of 0', () => {
			typePoint(0, 0);
			typeNumber(0);
			typeNumber(-10);

			expect(getToolState()).toBe('WAITING_FOR_FIRST_RADIUS');

			typeNumber(10);
			expect(getToolState()).toBe('WAITING_FOR_SECOND_RADIUS');
		});

		it('refuses a second radius of 0', () => {
			typePoint(10, 0);
			typePoint(0, 0);
			typeNumber(0);
			typeNumber(-4);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_SECOND_RADIUS');

			typeNumber(4);
			expect(getEntities()).toHaveLength(1);
			expect(getToolState()).toBe('WAITING_FOR_CENTER');
		});
	});

	describe('spline', () => {
		beforeEach(() => {
			setActiveTool(Tool.SPLINE);
		});

		it('ignores a point on top of the previous point', () => {
			click(0, 0);
			click(0, 0);
			click(10, 10);
			click(10, 10);
			pressEnter();

			expect(getEntities()).toHaveLength(1);
			expect((getEntities()[0] as SplineEntity).getFitPoints()).toEqual([
				new Point(0, 0),
				new Point(10, 10),
			]);
		});

		it('needs 2 different points to finish', () => {
			click(0, 0);
			click(0, 0);
			pressEnter();

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_NEXT_POINT');

			click(10, 0);
			pressEnter();
			expect(getEntities()).toHaveLength(1);
			expect(getToolState()).toBe('WAITING_FOR_FIRST_POINT');
		});
	});
});
