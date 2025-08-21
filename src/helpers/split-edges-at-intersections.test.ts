import {Arc, Point, Segment} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import {splitEdgesAtIntersections} from './split-edges-at-intersections.ts';

describe('splitEdgesAtIntersections (using constructors)', () => {
	it('returns empty array when given no edges', () => {
		expect(splitEdgesAtIntersections([])).toEqual([]);
	});

	it('leaves a single non-intersecting segment unchanged', () => {
		const seg = new Segment(new Point(0, 0), new Point(1, 1));
		const result = splitEdgesAtIntersections([seg]);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe(seg);
	});

	/**
	 *   \
	 *  --+---
	 *     \
	 */
	it('splits two crossing segments at their intersection point', () => {
		const seg1 = new Segment(new Point(0, 0), new Point(2, 0));
		const seg2 = new Segment(new Point(1, -1), new Point(1, 1));
		const result = splitEdgesAtIntersections([seg1, seg2]);

		// Expect 4 smaller segments: each original split at (1, 0)
		expect(result).toHaveLength(4);

		expect(result).toContainEqual(new Segment(new Point(0, 0), new Point(1, 0)));
		expect(result).toContainEqual(new Segment(new Point(1, 0), new Point(2, 0)));
		expect(result).toContainEqual(new Segment(new Point(1, -1), new Point(1, 0)));
		expect(result).toContainEqual(new Segment(new Point(1, 0), new Point(1, 1)));
	});

	/**
	 *      ______
	 *    /       \
	 *   |         |
	 *   -----X-----
	 */
	it('does not split when a segment only touches an arc at its endpoints', () => {
		const seg = new Segment(new Point(-1, 0), new Point(1, 0));
		const arc = new Arc(
			new Point(0, 0), // center
			1, // radius
			0, // startAngle
			Math.PI // endAngle (top half-circle)
		);

		const result = splitEdgesAtIntersections([seg, arc]);
		// Both intersections at endpoints only → no splits
		expect(result).toHaveLength(2);
		expect(result).toContainEqual(seg);
		expect(result).toContainEqual(arc);
	});

	/**
	 *     __----__ __---__
	 *   /       / \       \
	 *  |       |   |       |
	 *  |       |   |       |
	 *   \       \ /       /
	 *     --___-- --____-
	 */
	it('splits two full circles (arcs) into four smaller arcs at their two intersection points', () => {
		const arc1 = new Arc(new Point(0, 0), 1, 0, 2 * Math.PI);
		const arc2 = new Arc(new Point(1, 0), 1, 0, 2 * Math.PI);

		const result = splitEdgesAtIntersections([arc1, arc2]);

		// Two intersection points → each circle broken into two arcs
		const arcs = result.filter((e) => e instanceof Arc);
		expect(arcs).toHaveLength(4);
	});

	/**
	 *      |              |
	 *      |              |
	 * -----+--------------+----
	 *      |              |
	 *      |              |
	 *      |              |
	 * -----+--------------+----
	 *      |              |
	 *      |              |
	 */
	it('splits multiple lines into segments when they intersect multiple times', () => {
		const lineTop = new Segment(new Point(-70, 50), new Point(70, 50));
		const lineRight = new Segment(new Point(50, 70), new Point(50, -70));
		const lineBottom = new Segment(new Point(70, -50), new Point(-70, -50));
		const lineLeft = new Segment(new Point(-50, -70), new Point(-50, 70));

		const result = splitEdgesAtIntersections([lineTop, lineRight, lineBottom, lineLeft]);

		expect(result).toHaveLength(12);
	});

	/**
	 *      |         \
	 * -----+----------+----------
	 *      |            \
	 *      |             \
	 *      |              |
	 *      |             /
	 *      |            /
	 * -----+----------+-----------
	 *      |         /
	 */
	it('split multiple segments and arcs', () => {
		const lineTop = new Segment(new Point(-70, 50), new Point(70, 50));
		const arcRight = new Arc(new Point(-70, 0), 140, -Math.PI / 2, Math.PI / 2, true);
		const lineBottom = new Segment(new Point(70, -50), new Point(-70, -50));
		const lineLeft = new Segment(new Point(-50, -70), new Point(-50, 70));

		const edges = splitEdgesAtIntersections([
			lineTop,
			arcRight,
			lineBottom,
			lineLeft,
		]);

		expect(edges).toBeDefined();
		expect(edges?.filter((edge) => edge instanceof Segment)).toHaveLength(9);
		expect(edges?.filter((edge) => edge instanceof Arc)).toHaveLength(3);
	});
});
