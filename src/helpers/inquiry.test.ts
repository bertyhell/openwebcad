import { Point, Segment } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import {
	formatDistanceInfo,
	getBoundaryAreaInfo,
	getDistanceInfo,
	getPolygonAreaInfo,
} from './inquiry.ts';

function square(x: number, y: number, size: number): Segment[] {
	const corners = [
		new Point(x, y),
		new Point(x + size, y),
		new Point(x + size, y + size),
		new Point(x, y + size),
	];
	return corners.map((corner, index) => new Segment(corner, corners[(index + 1) % 4]));
}

describe('getDistanceInfo', () => {
	it('returns the distance, deltas and angle between 2 points', () => {
		const info = getDistanceInfo(new Point(1, 1), new Point(4, 5));
		expect(info.distance).toBeCloseTo(5);
		expect(info.deltaX).toBe(3);
		expect(info.deltaY).toBe(4);
		expect(info.angle).toBeCloseTo(53.13, 2);
	});

	it('returns angles between 0 and 360 degrees', () => {
		expect(getDistanceInfo(new Point(0, 0), new Point(0, -1)).angle).toBeCloseTo(270);
	});

	it('formats the result', () => {
		expect(formatDistanceInfo(getDistanceInfo(new Point(0, 0), new Point(10, 0)))).toBe(
			'Distance: 10, ΔX: 10, ΔY: 0, Angle: 0°'
		);
	});
});

describe('getPolygonAreaInfo', () => {
	it('returns the area and perimeter, independent of the direction of the points', () => {
		const points = [new Point(0, 0), new Point(4, 0), new Point(4, 3)];
		expect(getPolygonAreaInfo(points)).toEqual({ area: 6, perimeter: 12 });
		expect(getPolygonAreaInfo([...points].reverse())).toEqual({ area: 6, perimeter: 12 });
	});
});

describe('getBoundaryAreaInfo', () => {
	it('subtracts the holes from the area', () => {
		const info = getBoundaryAreaInfo({ boundary: square(0, 0, 10), holes: [square(2, 2, 3)] });
		expect(info.area).toBeCloseTo(91);
		expect(info.perimeter).toBeCloseTo(40);
	});
});
