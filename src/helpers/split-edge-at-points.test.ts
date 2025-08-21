import {Arc, Point} from "@flatten-js/core";
import {describe, expect, it} from 'vitest';
import {splitEdgeAtPoints} from "./split-edge-at-points.ts";

describe('SplitEdgeAtPoints', () => {
	it('Should split Arc edge into 3 parts', () => {
		const edge = new Arc(new Point(-70, 0), 140, -1.5707963267948966, 1.5707963267948966, true);
		const intersections = [new Point(60.76696830622021, -50), new Point(60.76696830622021, 50)];
		const parts = splitEdgeAtPoints(edge, intersections);
		expect(parts).toHaveLength(3);
	});
});
