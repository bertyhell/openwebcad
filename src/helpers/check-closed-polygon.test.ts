import {Point} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import type {StartAndEndpointEntity} from '../App.types.ts';
import {checkClosedPolygon} from './check-closed-polygon.ts';

class MockSegment implements StartAndEndpointEntity {
	constructor(
		private start: Point,
		private end: Point
	) {}
	getStartPoint() {
		return this.start;
	}
	getEndPoint() {
		return this.end;
	}
}

describe('checkClosedPolygon', () => {
	it('returns null for an empty array', () => {
		expect(checkClosedPolygon([])).toBeNull();
	});

	it('throws if a segment has zero length', () => {
		const p = new Point(0, 0);
		const zeroLen = new MockSegment(p, p);
		expect(() => checkClosedPolygon([zeroLen])).toThrowError('entity with zero length detected');
	});

	it('throws if unique‐points count ≠ number of segments', () => {
		// one segment has two distinct endpoints → 2 unique points ≠ 1 segment
		const a = new Point(0, 0);
		const b = new Point(1, 0);
		const seg = new MockSegment(a, b);
		expect(() => checkClosedPolygon([seg])).toThrowError(
			"number of unique points doesn't match number of entities"
		);
	});

	it('throws if some point doesn’t appear exactly twice', () => {
		// 3 segments, 3 unique points, but counts ≠ 2 for all
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		// A→B, B→C, C→B causes B count = 3, A = 1, C = 2
		const segs = [new MockSegment(A, B), new MockSegment(B, C), new MockSegment(C, B)];
		expect(() => checkClosedPolygon(segs)).toThrowError(
			"This polyline isn't closed. Some points do not appear twice"
		);
	});

	it('returns null for a disconnected “double‐loop”', () => {
		// two separate 2‐point loops → counts == 2, uniquePoints == 4, but disconnected
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(2, 0);
		const D = new Point(3, 0);
		const loop1 = [new MockSegment(A, B), new MockSegment(B, A)];
		const loop2 = [new MockSegment(C, D), new MockSegment(D, C)];
		const all = [...loop1, ...loop2];
		expect(checkClosedPolygon(all)).toBeNull();
	});

	it('orders a simple triangle correctly', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);

		// segments already properly directed: A→B, B→C, C→A
		const s0 = new MockSegment(A, B);
		const s1 = new MockSegment(B, C);
		const s2 = new MockSegment(C, A);

		// feed in shuffled order
		const input = [s1, s2, s0];
		const out = checkClosedPolygon(input);

		expect(out).not.toBeNull();
		// should come back in the loop order [A→B, B→C, C→A]
		expect(out).toEqual([s0, s1, s2]);
	});

	it('orders a square correctly even if input is scrambled', () => {
		const P0 = new Point(0, 0);
		const P1 = new Point(1, 0);
		const P2 = new Point(1, 1);
		const P3 = new Point(0, 1);

		// square edges, all oriented clockwise
		const e0 = new MockSegment(P0, P1);
		const e1 = new MockSegment(P1, P2);
		const e2 = new MockSegment(P2, P3);
		const e3 = new MockSegment(P3, P0);

		const scrambled = [e2, e0, e3, e1];
		const out = checkClosedPolygon(scrambled);

		expect(out).not.toBeNull();
		expect(out).toEqual([e0, e1, e2, e3]);
	});
});
