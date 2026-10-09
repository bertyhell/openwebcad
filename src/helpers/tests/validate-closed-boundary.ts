import { Arc, Segment } from '@flatten-js/core';
import { expect } from 'vitest';
import type { Edge } from '../../App.types.ts';
import { isPointEqual } from '../is-point-equal.ts';

export function validateClosedBoundary(
	boundary: Edge[] | null | undefined,
	expectedLength: number,
	expectedSegments: number,
	expectedArcs: number
) {
	expect(boundary).not.toBeNull();
	expect(boundary).not.toBeUndefined();
	if (boundary) {
		expect(boundary).toHaveLength(expectedLength);
		// And they must form a closed loop
		for (let i = 0; i < boundary.length; i++) {
			const curr = boundary[i];
			const next = boundary[(i + 1) % boundary.length];
			expect(isPointEqual(curr.end, next.start)).toBe(true);
		}
		const segments = boundary.filter((edge) => edge instanceof Segment);
		const arcs = boundary.filter((edge) => edge instanceof Arc);
		expect(segments).toHaveLength(expectedSegments);
		expect(arcs).toHaveLength(expectedArcs);
	}
}
