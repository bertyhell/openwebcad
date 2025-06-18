import {Point} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import type {StartAndEndpointEntity} from '../App.types.ts';
import {isClosedPolygon} from './is-closed-polygon.ts'; // Mock implementation for StartAndEndpointEntity

// Mock implementation for StartAndEndpointEntity
class MockEntity implements StartAndEndpointEntity {
	constructor(
		private start: Point,
		private end: Point
	) {}

	getStartPoint(): Point {
		return this.start;
	}

	getEndPoint(): Point {
		return this.end;
	}
}

describe('PolygonChecker.isClosedPolygon', () => {
	it('should return true for a simple triangle', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const entities = [new MockEntity(A, B), new MockEntity(B, C), new MockEntity(C, A)];
		expect(isClosedPolygon(entities)).toBe(true);
	});

	it('should return true for a square with mixed ordering and reversed segments', () => {
		const P1 = new Point(0, 0);
		const P2 = new Point(1, 0);
		const P3 = new Point(1, 1);
		const P4 = new Point(0, 1);
		const entities = [
			new MockEntity(P2, P3),
			new MockEntity(P4, P1),
			new MockEntity(P3, P4),
			new MockEntity(P1, P2),
		];
		expect(isClosedPolygon(entities)).toBe(true);
	});

	it('should return false for an open chain of segments', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(2, 0);
		const entities = [new MockEntity(A, B), new MockEntity(B, C)];
		expect(isClosedPolygon(entities)).toBe(false);
	});

	it('should return false when there is a zero-length segment', () => {
		const A = new Point(0, 0);
		const entities = [new MockEntity(A, A)];
		expect(isClosedPolygon(entities)).toBe(false);
	});

	it('should return false when three segments share the same point', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const D = new Point(-1, 0);
		const entities = [new MockEntity(A, B), new MockEntity(A, C), new MockEntity(A, D)];
		expect(isClosedPolygon(entities)).toBe(false);
	});

	it('should return false for two disjoint loops', () => {
		const A = new Point(0, 0);
		const B = new Point(1, 0);
		const C = new Point(0, 1);
		const D = new Point(2, 2);
		const E = new Point(3, 2);
		const F = new Point(2, 3);
		const entities = [
			// First triangle
			new MockEntity(A, B),
			new MockEntity(B, C),
			new MockEntity(C, A),
			// Second triangle
			new MockEntity(D, E),
			new MockEntity(E, F),
			new MockEntity(F, D),
		];
		expect(isClosedPolygon(entities)).toBe(false);
	});
});
