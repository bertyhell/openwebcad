import {Arc, Point, Segment} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import {splitEdgesAtIntersections} from './split-edges-at-intersections.ts';
import {expectIsEqualNumberArray} from "./tests/expect-is-equal-number-array.ts";

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
		const sweeps = arcs.map((arc) => arc.sweep);
		expectIsEqualNumberArray(
			sweeps,
			[
				1.0471975511965976, 4.188790204786391, 1.0471975511965974, 2.0943951023931957,
				2.094395102393195, 2.0943951023931957,
			]
		);
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

		const edges = splitEdgesAtIntersections([lineTop, arcRight, lineBottom, lineLeft]);

		expect(edges).toBeDefined();
		const segments = edges?.filter((edge) => edge instanceof Segment);
		expect(segments).toHaveLength(9);
		const arcs = edges?.filter((edge) => edge instanceof Arc);
		const sweeps = arcs.map((arc) => arc.sweep);
		expectIsEqualNumberArray(
			sweeps,
				[
					1.2055891055045294,
					0.7304144425807344,
					1.2055891055045294

			]
		);
	});

	/**
	 *      /¯¯¯¯¯¯¯¯¯¯¯¯\
	 *   |¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯\¯¯|
	 *  /|                  \ |
	 * | |                    |
	 * | |                    |\
	 * | |                    | |
	 * | |                    |/
	 *  \|                   /|
	 *   |--\-------------/--|
	 *       \__________ /
	 */
	it('detects arc and segment parts', () => {
		// circle
		const center = new Point(0, 0);
		const circle = new Arc(center, 1, 0, Math.PI * 2, true);
		// square segments
		const side = 0.85;
		const left = new Segment(new Point(-side, -side), new Point(-side, side));
		const top = new Segment(new Point(-side, -side), new Point(side, -side));
		const right = new Segment(new Point(side, -side), new Point(side, side));
		const bottom = new Segment(new Point(side, side), new Point(-side, side));
		const edges = splitEdgesAtIntersections([circle, left, top, right, bottom]);

		expect(edges).toBeDefined();
		const segments = edges?.filter((edge) => edge instanceof Segment);
		expect(segments).toHaveLength(12);
		const arcs = edges?.filter((edge) => edge instanceof Arc);
		const arcSweeps = arcs.map((arc) => (arc as Arc).sweep);
		expectIsEqualNumberArray(
			arcSweeps,
			[
				0.5548110329800715, 0.46117426083475355, 1.1096220659601435, 0.4611742608347531,
				1.109622065960143, 0.4611742608347531, 1.109622065960143, 0.46117426083475443,
				0.5548110329800711,
			]
		);
	});

	/**
	 *                      |
	 *                      |
	 *       ,-¯¯¯¯¯¯¯¯¯¯¯-,|
	 *     /                |\
	 *   /                  | \
	 *  |                   |  |
	 * |                    |   |
	 * |                    | X |
	 *  |                   |  |
	 *   \                  | /
	 *     \                /
	 *       '-__________-' |
	 *                      |
	 */
	it('Split circle arc and segment', () => {
		const arc = new Arc(new Point(0, 0), 1, 0, Math.PI * 2, true);
		const segment = new Segment(new Point(0.5, -2), new Point(0.5, 2));
		const parts = splitEdgesAtIntersections([arc, segment]);

		expect(parts).toHaveLength(6);
		expect(parts.filter(part => part instanceof Arc)).toHaveLength(3);
		expect(parts.filter(part => part instanceof Segment)).toHaveLength(3);
	})
});
