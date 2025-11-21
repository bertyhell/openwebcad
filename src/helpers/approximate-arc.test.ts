import {describe, expect, it} from "vitest";
import {approximateArc} from "./approximate-arc.ts";
import {Arc, Point} from "@flatten-js/core";
import {expectIsEqualNumberArray} from "./tests/expect-is-equal-number-array.ts";

describe('approximate arc', () => {
	it('should return 4 parts', () => {
		const center = new Point(0, 0);
		const arc = new Arc(center, 1, 0, 2 * Math.PI, true);
		const parts = approximateArc(arc, 4);
		expect(parts).toHaveLength(4);
		expectIsEqualNumberArray([
			parts[0].start.x,
			parts[0].start.y,
			parts[1].start.x,
			parts[1].start.y,
			parts[2].start.x,
			parts[2].start.y,
			parts[3].start.x,
			parts[3].start.y,
		], [
			1,
			0,
			0,
			1,
			-1,
			0,
			0,
			-1,
		]);
	})
})
