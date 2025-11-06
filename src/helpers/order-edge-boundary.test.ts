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

	it('should order arcs and edges boundary 2', () => {
		const boundary = [
			new Segment(new Point(507, 845), new Point(587.9408656026364, 663.3765942574988)),
			new Arc(new Point(541, 847), 189.52836199366033, 4.96266561537413, 5.622925461276857, true),
			new Arc(new Point(541, 847), 189.52836199366047, 5.622925461276857, 6.283185307179585, true),
			new Arc(new Point(541, 847), 189.5283619936605, 0, 0.5833498090667931, true),
			new Arc(
				new Point(541, 847),
				189.52836199366035,
				0.5833498090667931,
				1.1666996181335865,
				true
			),
			new Segment(
				new Point(615.5203500905536, 1021.2633565107172),
				new Point(507.00000000000006, 844.9999999999999)
			),
		];

		const orderedBoundary = orderEdgeBoundary(boundary);
		expect(orderedBoundary).toHaveLength(6);
		validateClosedBoundary(orderedBoundary, 6);
	});
});
