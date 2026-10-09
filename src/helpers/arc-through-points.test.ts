import { type Arc, Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { getArcThroughPoints } from './arc-through-points.ts';

describe('getArcThroughPoints', () => {
	it('creates the upper half circle counterclockwise', () => {
		const arc = getArcThroughPoints(new Point(1, 0), new Point(0, 1), new Point(-1, 0));
		const shape = arc?.getShape() as Arc;
		expect(shape.center.x).toBeCloseTo(0);
		expect(shape.center.y).toBeCloseTo(0);
		expect(shape.r.valueOf()).toBeCloseTo(1);
		expect(shape.counterClockwise).toBe(true);
		expect(shape.contains(new Point(0, 1))).toBe(true);
		expect(shape.contains(new Point(0, -1))).toBe(false);
	});

	it('creates the lower half circle clockwise', () => {
		const arc = getArcThroughPoints(new Point(1, 0), new Point(0, -1), new Point(-1, 0));
		const shape = arc?.getShape() as Arc;
		expect(shape.counterClockwise).toBe(false);
		expect(shape.contains(new Point(0, -1))).toBe(true);
		expect(shape.contains(new Point(0, 1))).toBe(false);
	});

	it('returns null for points on one line', () => {
		expect(getArcThroughPoints(new Point(0, 0), new Point(1, 1), new Point(2, 2))).toBeNull();
	});
});
