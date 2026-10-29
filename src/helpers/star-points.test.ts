import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { getStarPoints } from './star-points';

describe('getStarPoints', () => {
	it('alternates between the first and the second circle', () => {
		const center = new Point(10, 20);
		const corners = getStarPoints(center, new Point(20, 20), 4, 5);

		expect(corners).toHaveLength(10);
		corners.forEach((corner, index) => {
			expect(corner.distanceTo(center)[0]).toBeCloseTo(index % 2 === 0 ? 10 : 4);
		});
	});

	it('starts at the first radius point and spaces the corners evenly', () => {
		const center = new Point(0, 0);
		const corners = getStarPoints(center, new Point(0, 10), 5, 4);

		expect(corners[0].x).toBeCloseTo(0);
		expect(corners[0].y).toBeCloseTo(10);
		// 4 points => 8 corners, 45 degrees apart
		expect(corners[1].x).toBeCloseTo(-5 * Math.SQRT1_2);
		expect(corners[1].y).toBeCloseTo(5 * Math.SQRT1_2);
		expect(corners[2].x).toBeCloseTo(-10);
		expect(corners[2].y).toBeCloseTo(0);
	});
});
