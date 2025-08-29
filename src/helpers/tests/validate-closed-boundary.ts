import type {Arc, Segment} from '@flatten-js/core';
import {expect} from 'vitest';
import {isPointEqual} from '../is-point-equal.ts';

export function validateClosedBoundary(boundary: (Segment | Arc)[] | null, expectedLength: number) {
	expect(boundary).not.toBeNull();
	if (boundary) {
		expect(boundary).toHaveLength(expectedLength);
		// And they must form a closed loop
		for (let i = 0; i < boundary.length; i++) {
			const curr = boundary[i];
			const next = boundary[(i + 1) % boundary.length];
			expect(isPointEqual(curr.end, next.start)).toBe(true);
		}
	}
}
