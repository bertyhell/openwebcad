import {Arc, Point, Segment} from '@flatten-js/core'; // tests/findEnclosingBoundary.test.ts
import {describe, expect, it} from 'vitest';
import {findEnclosingBoundary} from './findEnclosingBoundary.ts';
import {isPointEqual} from "./is-point-equal.ts";

function validateClosedBoundary(boundary: (Segment | Arc)[] | null, expectedLength: number) {
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

		validateClosedBoundary(boundary, edges.length);

		// Must contain exactly those three edges, in any order
		for (let i = 0; i < edges.length; i++) {
			const edge = edges[i];
			const boundaryEdge = boundary?.find(
				(e) =>
					(isPointEqual(e.start, edge.start) && isPointEqual(e.end, edge.end)) ||
					(isPointEqual(e.start, edge.end) && isPointEqual(e.end, edge.start))
			);
			expect(boundaryEdge).not.toBeUndefined();
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
		validateClosedBoundary(boundary, 4);
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
		const triagonalBoundary = findEnclosingBoundary(insideTriangle, all);
		validateClosedBoundary(triagonalBoundary, 3);

		// Square query
		const squareBoundary = findEnclosingBoundary(insideSquare, all);
		validateClosedBoundary(squareBoundary, 4);
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
		validateClosedBoundary(boundary, 3);
	});

	/**
	 *         ______
	 *   |   X      |
	 *   |
	 *      ----
	 */
	it('detects no boundary for loose segments', () => {
		const lineTop = new Segment(new Point(10, 0), new Point(30, 0));
		const lineRight = new Segment(new Point(30, 0), new Point(30, -10));
		const lineBottom = new Segment(new Point(20, -30), new Point(10, -30));
		const lineLeft = new Segment(new Point(0, -10), new Point(0, -25));
		const boundary = findEnclosingBoundary(new Point(0, 0.2), [
			lineTop,
			lineRight,
			lineBottom,
			lineLeft,
		]);

		expect(boundary).toBeNull();
	});

	/**
	 * ----------------------------
	 * |                          |
	 * |                  ______  |
	 * |            |   X      |  |
	 * |            |             |
	 * |               ----       |
	 * |                          |
	 * |---------------------------
	 */
	it('detects boundary outside other line segments', () => {
		const lineTop = new Segment(new Point(10, 0), new Point(30, 0));
		const lineRight = new Segment(new Point(30, 0), new Point(30, -10));
		const lineBottom = new Segment(new Point(20, -30), new Point(10, -30));
		const lineLeft = new Segment(new Point(0, -10), new Point(0, -25));

		const lineTop2 = new Segment(new Point(-50, 50), new Point(50, 50));
		const lineRight2 = new Segment(new Point(50, 50), new Point(50, -50));
		const lineBottom2 = new Segment(new Point(50, -50), new Point(-50, -50));
		const lineLeft2 = new Segment(new Point(-50, -50), new Point(-50, 50));

		const boundary = findEnclosingBoundary(new Point(0, 0.2), [
			lineTop,
			lineTop2,
			lineRight,
			lineRight2,
			lineBottom,
			lineBottom2,
			lineLeft,
			lineLeft2,
		]);
		validateClosedBoundary(boundary, 4);
	});

	/**
	 *      |                          |
	 *      |                          |
	 * -----+--------------------------+----
	 *      |                          |
	 *      |                  ______  |
	 *      |            |   X      |  |
	 *      |            |             |
	 *      |               ----       |
	 *      |                          |
	 * -----+--------------------------+----
	 *      |                          |
	 *      |                          |
	 */
	it('detects boundary outside other line segments even for not exact endpoints', () => {
		const lineTop = new Segment(new Point(10, 0), new Point(30, 0));
		const lineRight = new Segment(new Point(30, 0), new Point(30, -10));
		const lineBottom = new Segment(new Point(20, -30), new Point(10, -30));
		const lineLeft = new Segment(new Point(0, -10), new Point(0, -25));

		const lineTop2 = new Segment(new Point(-70, 50), new Point(70, 50));
		const lineRight2 = new Segment(new Point(50, 70), new Point(50, -70));
		const lineBottom2 = new Segment(new Point(70, -50), new Point(-70, -50));
		const lineLeft2 = new Segment(new Point(-50, -70), new Point(-50, 70));

		const boundary = findEnclosingBoundary(new Point(0, 0.2), [
			lineTop,
			lineTop2,
			lineRight,
			lineRight2,
			lineBottom,
			lineBottom2,
			lineLeft,
			lineLeft2,
		]);

		validateClosedBoundary(boundary, 4);
	});

	/**
	 *      |                          \
	 *      |                           \
	 * -----+----------------------------+----------
	 *      |                              \
	 *      |                  ______       \
	 *      |            |   X      |        |
	 *      |            |                   |
	 *      |               ----            /
	 *      |                              /
	 * -----+----------------------------+-----------
	 *      |                           /
	 *      |                         /
	 */
	it('detects boundary outside other line segments even for not exact endpoints with arc', () => {
		const lineTop = new Segment(new Point(10, 0), new Point(30, 0));
		const lineRight = new Segment(new Point(30, 0), new Point(30, -10));
		const lineBottom = new Segment(new Point(20, -30), new Point(10, -30));
		const lineLeft = new Segment(new Point(0, -10), new Point(0, -25));

		const lineTop2 = new Segment(new Point(-70, 50), new Point(70, 50));
		const arcRight2 = new Arc(new Point(-70, 0), 140, -Math.PI / 2, Math.PI / 2, true);
		const lineBottom2 = new Segment(new Point(70, -50), new Point(-70, -50));
		const lineLeft2 = new Segment(new Point(-50, -70), new Point(-50, 70));

		const boundary = findEnclosingBoundary(new Point(0, 0.2), [
			lineTop,
			lineTop2,
			lineRight,
			arcRight2,
			lineBottom,
			lineBottom2,
			lineLeft,
			lineLeft2,
		]);

		validateClosedBoundary(boundary, 4);
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
				expect(boundary[0] instanceof Arc).toBe(true);
				expect(isPointEqual(boundary[0].start, boundary[0].end));
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

			validateClosedBoundary(boundary, 2);
		});
	});
});
