import {Arc, Point, Segment} from "@flatten-js/core";
import {describe, expect, it} from "vitest";
import {orderEdgeBoundary} from "./order-edge-boundary.ts";
import {validateClosedBoundary} from "./tests/validate-closed-boundary.ts";

describe('orderBoundary()', () => {
	it('should order square boundary', () => {
		const boundary = [
			new Segment(new Point(0, 0), new Point(0, 1)),
			new Segment(new Point(0, 0), new Point(1, 0)),
			new Segment(new Point(1, 0), new Point(1, 1)),
			new Segment(new Point(0, 1), new Point(1, 1)),
		];
		const orderedBoundary = orderEdgeBoundary(boundary);
		expect(orderedBoundary).toHaveLength(4);
		validateClosedBoundary(orderedBoundary, 4);
	});

	it('should order arcs and edges boundary', () => {
		const boundary = [
			new Segment(new Point(0, 0), new Point(0, 1)),
			new Arc(new Point(0, 0), 1, Math.PI / 2, 0, false),
			new Segment(new Point(1, 0), new Point(0, 0)),
		];
		const orderedBoundary = orderEdgeBoundary(boundary);
		expect(orderedBoundary).toHaveLength(3);
		validateClosedBoundary(orderedBoundary, 3);
	});
});
