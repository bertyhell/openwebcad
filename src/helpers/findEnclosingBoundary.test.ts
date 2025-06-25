import {Arc, Point, Segment} from '@flatten-js/core'; // tests/findEnclosingBoundary.test.ts
import {describe, expect, it} from 'vitest';
import {findEnclosingBoundary} from './findEnclosingBoundary.ts';

describe('findEnclosingBoundary', () => {
	it('returns null for empty input', () => {
		const pt = new Point(0, 0);
		const result = findEnclosingBoundary(pt, []);
		expect(result).toBeNull();
	});

	/**
	 * (X)
	 * A----B----C
	 * Open path: no loop
	 */
	it('returns null for non-closed segments', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(2, 0);
		const segAB = new Segment(A, B);
		const segBC = new Segment(B, C);
		// Only two segments in a line—no closed loop
		const result = findEnclosingBoundary(new Point(1, 0.1), [segAB, segBC]);
		expect(result).toBeNull();
	});

	/**
	 *       C
	 *      / \
	 *     / X \
	 *    A-----B
	 */
	it('detects triangular boundary', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const segAB = new Segment(A, B);
		const segBC = new Segment(B, C);
		const segCA = new Segment(C, A);
		const edges = [segAB, segBC, segCA];
		const query = new Point(0.2, 0.2);

		const boundary = findEnclosingBoundary(query, edges);
		expect(boundary).not.toBeNull();
		if (boundary) {
			expect(boundary).toHaveLength(3);
			// Must contain exactly those three edges, in any order
			for (const e of edges) {
				expect(boundary).toContain(e);
			}
			// And they must form a closed loop
			for (let i = 0; i < boundary.length; i++) {
				const curr = boundary[i];
				const next = boundary[(i + 1) % boundary.length];
				expect(curr.end.equalTo(next.start)).toBe(true);
			}
		}
	});

	/**
	 *    C     (X)
	 *    | \
	 *    |   \
	 *    A-----B
	 */
	it('returns null when point is outside triangle', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const segAB = new Segment(A, B);
		const segBC = new Segment(B, C);
		const segCA = new Segment(C, A);
		const query = new Point(1, 1); // clearly outside
		const result = findEnclosingBoundary(query, [segAB, segBC, segCA]);
		expect(result).toBeNull();
	});

	/**
	 *    p3-----p2
	 *    |   X   |
	 *    p0-----p1
	 */
	it('detects square boundary with random order', () => {
		const p0 = new Point(0, 0);
		const p1 = new Point(1, 0);
		const p2 = new Point(1, 1);
		const p3 = new Point(0, 1);
		const seg01 = new Segment(p0, p1);
		const seg12 = new Segment(p1, p2);
		const seg23 = new Segment(p2, p3);
		const seg30 = new Segment(p3, p0);
		const shuffled = [seg23, seg01, seg30, seg12];
		const query = new Point(0.5, 0.5);

		const boundary = findEnclosingBoundary(query, shuffled);
		expect(boundary).not.toBeNull();
		if (boundary) {
			expect(boundary).toHaveLength(4);
			for (const edge of [seg01, seg12, seg23, seg30]) {
				expect(boundary).toContain(edge);
			}
			// Closed‐loop connectivity
			for (let i = 0; i < boundary.length; i++) {
				const curr = boundary[i];
				const next = boundary[(i + 1) % boundary.length];
				expect(curr.end.equalTo(next.start)).toBe(true);
			}
		}
	});

	/**
	 *   C
	 *   | \            S3---S2
	 *   |   \          |    |
	 *   | X   \        | X  |
	 *   A------B      S0---S1
	 */
	it('selects correct boundary among multiple loops', () => {
		// Triangle
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const triAB = new Segment(A, B);
		const triBC = new Segment(B, C);
		const triCA = new Segment(C, A);
		// Square
		const S0 = new Point(2, 2);
		const S1 = new Point(3, 2);
		const S2 = new Point(3, 3);
		const S3 = new Point(2, 3);
		const sq01 = new Segment(S0, S1);
		const sq12 = new Segment(S1, S2);
		const sq23 = new Segment(S2, S3);
		const sq30 = new Segment(S3, S0);

		const all = [triAB, triBC, triCA, sq01, sq12, sq23, sq30];
		const insideTriangle = new Point(0.1, 0.1);
		const insideSquare = new Point(2.5, 2.5);

		// Triangle query
		const triBound = findEnclosingBoundary(insideTriangle, all);
		expect(triBound).not.toBeNull();
		if (triBound) {
			expect(triBound).toHaveLength(3);
			for (const e of [triAB, triBC, triCA]) {
				expect(triBound).toContain(e);
			}
		}

		// Square query
		const sqBound = findEnclosingBoundary(insideSquare, all);
		expect(sqBound).not.toBeNull();
		if (sqBound) {
			expect(sqBound).toHaveLength(4);
			for (const e of [sq01, sq12, sq23, sq30]) {
				expect(sqBound).toContain(e);
			}
		}
	});

	/**
	 *       C
	 *      / \
	 *     /   \
	 *    A--X--B
	 */
	it('returns boundary when point is on edge', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const segAB = new Segment(A, B);
		const segBC = new Segment(B, C);
		const segCA = new Segment(C, A);

		// Point exactly on AB
		const onEdge = new Point(0.5, 0);
		const boundary = findEnclosingBoundary(onEdge, [segAB, segBC, segCA]);
		expect(boundary).not.toBeNull();
		if (boundary) {
			expect(boundary).toHaveLength(3);
			for (const e of [segAB, segBC, segCA]) {
				expect(boundary).toContain(e);
			}
		}
	});

	describe('arcs', () => {
		/**
		 *       -----
		 *     /   X   \
		 *    |         |
		 *     \       /
		 *       -----
		 */
		it('detects full circle arc as boundary', () => {
			const center = new Point(0, 0);
			const fullCircle = new Arc(center, 1, 0, 2 * Math.PI, false);
			const boundary = findEnclosingBoundary(new Point(0, 0), [fullCircle]);
			expect(boundary).not.toBeNull();
			if (boundary) {
				expect(boundary).toHaveLength(1);
				expect(boundary[0]).toBe(fullCircle);
			}
		});

		/**
		 *      ______
		 *    /   X   \
		 *   |         |
		 *   -----------
		 */
		it('detects half-disk boundary formed by arc and segment', () => {
			const center = new Point(0, 0);
			// Upper half-circle (0 → π)
			const halfCircle = new Arc(center, 1, 0, Math.PI, true);
			const closing = new Segment(halfCircle.end, halfCircle.start);
			const boundary = findEnclosingBoundary(new Point(0, 0.2), [halfCircle, closing]);

			expect(boundary).not.toBeNull();
			if (boundary) {
				expect(boundary).toHaveLength(2);
				expect(boundary).toContain(halfCircle);
				expect(boundary).toContain(closing);
				// Ensure closure
				const [edge1, edge2] = boundary as (Segment | Arc)[];
				expect(edge1.end.equalTo(edge2.start)).toBe(true);
				expect(edge2.end.equalTo(edge1.start)).toBe(true);
			}
		});
	});
});
