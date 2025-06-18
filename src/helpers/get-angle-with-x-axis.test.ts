import {Point} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import {TO_DEGREES} from '../App.consts.ts';
import {getAngleWithXAxis} from './get-angle-with-x-axis.ts';

describe('getAngleWithXAxis', () => {
	it('should return 90 degrees in radians', () => {
		const angle = getAngleWithXAxis(new Point(0, 0), new Point(0, 10));
		expect(angle * TO_DEGREES).toBeCloseTo(90);
	});

	it('should return 0 degrees in radians', () => {
		const angle = getAngleWithXAxis(new Point(0, 0), new Point(10, 0));
		expect(angle * TO_DEGREES).toBeCloseTo(0);
	});

	it('should return 45 degrees in radians', () => {
		const angle = getAngleWithXAxis(new Point(0, 0), new Point(10, 10));
		expect(angle * TO_DEGREES).toBeCloseTo(45);
	});

	it('should return 270 degrees in radians', () => {
		const angle = getAngleWithXAxis(new Point(0, 0), new Point(0, -10));
		expect(angle * TO_DEGREES).toBeCloseTo(270);
	});
});
