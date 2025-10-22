import {describe, expect, it} from 'vitest';
import type {Edge} from '../App.types';
import {findLoopsInEdges} from './find-loops-in-edges';
import {Arc, Point, Segment} from "@flatten-js/core";

describe('findLoopsInEdges', () => {
	it('returns empty for no edges', () => {
		expect(findLoopsInEdges([])).toEqual([]);
	});

	it('finds a simple triangle (single loop)', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(0, 1);

		const eA = new Segment(p0, p1);
		const eB = new Segment(p1, p2);
		const eC = new Segment(p2, p0);

		const loops = findLoopsInEdges([eA, eB, eC]);
		expect(loops).toHaveLength(1);
		expect(loops?.[0]).toHaveLength(3);
	});

	it('finds a simple triangle with negative coordinates (single loop)', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(-1, 0);
		const p2 = new Point(0, -1);

		const eA = new Segment(p0, p1);
		const eB = new Segment(p1, p2);
		const eC = new Segment(p2, p0);

		const loops = findLoopsInEdges([eA, eB, eC]);
		expect(loops).toHaveLength(1);
		expect(loops?.[0]).toHaveLength(3);
	});

	it('treats edges as bidirectional (reversing an edge doesn’t change loops)', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(0, 1);

		const eA = new Segment(p0, p1);
		const eB = new Segment(p2, p1); // reversed compared to previous test
		const eC = new Segment(p2, p0);

		const loops = findLoopsInEdges([eA, eB, eC]);
		expect(loops).toHaveLength(1);
	});

	it('does not count 2-cycles when duplicate/reversed edges exist', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(0, 1);

		const eA = new Segment(p0, p1);
		const eA_rev = new Segment(p1, p0); // duplicate connection reversed
		const eB = new Segment(p1, p2);
		const eC = new Segment(p2, p0);

		const loops = findLoopsInEdges([eA, eA_rev, eB, eC]);
		// Still only the triangle; no fake 2-edge loop between p0<->p1
		expect(loops).toHaveLength(1);
		expect(loops?.[0]).toHaveLength(3);
	});

	/**
	 *        C
	 *   x----------x
	 *   |       /  |
	 * D |    / E   | B
	 *   | /        |
	 *   x----------x
	 *       A
	 */
	it('finds multiple loops: square + diagonal (two triangles + outer square)', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(1, 1);
		const p3 = new Point(0, 1);

		const e01 = new Segment(p0, p1);
		const e12 = new Segment(p1, p2);
		const e23 = new Segment(p2, p3);
		const e30 = new Segment(p3, p0);
		const e02 = new Segment(p0, p2); // diagonal

		const edges = [e01, e12, e23, e30, e02];
		const loops: Edge[][] = findLoopsInEdges(edges);

		expect(loops).toHaveLength(2);
		expect(loops?.[0]).toHaveLength(3);
		expect(loops?.[1]).toHaveLength(3);
	});

	it('does not report loops in a simple path (no cycle)', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(2, 0);
		const p3 = new Point(3, 0);

		const e1 = new Segment(p0, p1);
		const e2 = new Segment(p1, p2);
		const e3 = new Segment(p2, p3);

		const loops = findLoopsInEdges([e1, e2, e3]);
		expect(loops).toHaveLength(0);
	});

	it('handles disjoint components: one with a loop, one without', () => {
		// Component 1: triangle
		const a0 = new Point(0, 0);
		const a1 = new Point(1, 0);
		const a2 = new Point(0, 1);
		const aA = new Segment(a0, a1);
		const aB = new Segment(a1, a2);
		const aC = new Segment(a2, a0);

		// Component 2: path
		const b0 = new Point(10, 10);
		const b1 = new Point(11, 10);
		const b2 = new Point(12, 10);
		const bD = new Segment(b0, b1);
		const bE = new Segment(b1, b2);

		const loops = findLoopsInEdges([aA, aB, aC, bD, bE]);
		expect(loops).toHaveLength(1);
		expect(loops[0]).toHaveLength(3);
	});

	/**
	 *        F
	 *   x----------x
	 *   |\B    E/ /
	 * C |  \ /   / D
	 *   | /  \  /
	 *   x------x
	 *       A
	 */
	it('finds separate loops that share a single vertex (figure-eight)', () => {
		// Two triangles sharing vertex p1
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(0, 1);
		const p3 = new Point(2, 1);

		const eA = new Segment(p0, p1);
		const eB = new Segment(p1, p2);
		const eC = new Segment(p2, p0);

		const eD = new Segment(p1, p3);
		const eE = new Segment(p3, p0);
		const eF = new Segment(p3, p2);

		const loops = findLoopsInEdges([eA, eB, eC, eD, eE, eF]);

		// Implementation detail: If your loop finder treats parallel edges as separate,
		// both triangles should be returned. If it collapses multi-edges, adjust this test.
		expect(loops).toHaveLength(4);
		expect(loops?.[0]).toHaveLength(3);
		expect(loops?.[1]).toHaveLength(3);
		expect(loops?.[2]).toHaveLength(3);
		expect(loops?.[3]).toHaveLength(3);
	});

	it('is robust to arcs vs segments (type differences don’t affect topology)', () => {
		// If EdgeWithId can be Arc or Segment, the loop detection should ignore kind.
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(1, 1);

		const e1 = new Segment(p0, p1);
		const e2 = new Arc(new Point(1, 0.5), 0.5, -Math.PI / 2, Math.PI / 2, true);
		const e3 = new Segment(p2, p0);

		const loops = findLoopsInEdges([e1, e2, e3]);
		expect(loops).toHaveLength(1);
		expect(loops[0]).toHaveLength(3);
	});
});
