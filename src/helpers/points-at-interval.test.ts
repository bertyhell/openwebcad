import { Arc, Point, Segment } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { getPointsAtInterval } from './points-at-interval.ts';

describe('getPointsAtInterval', () => {
	it('places points along connected edges without the start and end point', () => {
		const edges = [
			new Segment(new Point(0, 0), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(10, 10)),
		];
		const points = getPointsAtInterval(edges, 5);
		expect(points.map((point) => [point.x, point.y])).toEqual([
			[5, 0],
			[10, 0],
			[10, 5],
		]);
	});

	it('follows arcs', () => {
		const halfCircle = new Arc(new Point(0, 0), 10, 0, Math.PI, true);
		const [point] = getPointsAtInterval([halfCircle], halfCircle.length / 2);
		expect(point.x).toBeCloseTo(0);
		expect(point.y).toBeCloseTo(10);
	});

	it('returns nothing for an invalid interval', () => {
		expect(getPointsAtInterval([new Segment(new Point(0, 0), new Point(1, 0))], 0)).toEqual([]);
	});
});
