import {Point} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import {ArcEntity} from './ArcEntity.ts';

describe('getDistance', () => {
	it('should return distance from a point to an arc', () => {
		const arc = new ArcEntity('layer1', new Point(20, 20), 20, 0, 2 * Math.PI * 0.75, true);
		const distanceInfo = arc.distanceTo(new Point(20 - 14.14, 20 + 14.14));
		expect(distanceInfo).toBeDefined();
		if (!distanceInfo) return;
		expect(distanceInfo[0]).toBeLessThan(1);
	});
});
