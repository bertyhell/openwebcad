import {describe, expect, it} from "vitest";
import {Arc, Point, Segment} from "@flatten-js/core";
import {unionEdges} from "./union-edges.ts";
import {TAU} from "./consts.ts";

describe("unionEdges", () => {
	it ('should merge segments that are coliniear and connected', () => {
		const edges = [
			new Segment(new Point(0, 0), new Point(1, 0)),
			new Segment(new Point(1, 0), new Point(4, 0)),
			new Segment(new Point(4, 0), new Point(6, 0)),
		];
		const mergedEdges = unionEdges(edges);
		expect(mergedEdges).toHaveLength(1)
	})

	it('should merge 4 quarters of a circle', () => {
		const edges = [
			new Arc(new Point(0, 0), 1, 0, TAU/4, true),
			new Arc(new Point(0, 0), 1, TAU/4, TAU/2, true),
			new Arc(new Point(0, 0), 1, TAU/2, 3*TAU/4, true),
			new Arc(new Point(0, 0), 1, 3*TAU/4, TAU, true),
		];
		const mergedEdges = unionEdges(edges);
		expect(mergedEdges).toHaveLength(1)
	})

	it('should merge 3 quarters of a circle without segment', () => {
		const edges = [
			new Arc(new Point(0, 0), 1, 0, TAU/4, true),
			new Arc(new Point(0, 0), 1, TAU/4, TAU/2, true),
			new Segment(new Point(0, -1), new Point(1, -1)),
			new Arc(new Point(0, 0), 1, 3*TAU/4, TAU, true),
		];
		const mergedEdges = unionEdges(edges);
		expect(mergedEdges).toHaveLength(2)
	})

	it('should not merge disconnected edges', () => {
		const edges = [
			new Segment(new Point(0, 0), new Point(1, 0)),
			new Segment(new Point(3, 0), new Point(4, 0)),
			new Segment(new Point(5, 0), new Point(6, 0)),
		];
		const mergedEdges = unionEdges(edges);
		expect(mergedEdges).toHaveLength(3)
	})
})
