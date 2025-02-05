import { describe, it, expect } from 'vitest';
import { svgPathToSegments } from './convert-svg-path-to-line-segments';

describe('svgPathToSegments', () => {
	it('should handle simple move and line commands', () => {
		const path = 'M 10 10 L 20 20';
		const segments = svgPathToSegments(path);
		expect(segments).toEqual([
			{ x1: 10, y1: 10, x2: 20, y2: 20 },
		]);
	});

	it('should handle relative line commands', () => {
		const path = 'M 10 10 l 10 10';
		const segments = svgPathToSegments(path);
		expect(segments).toEqual([
			{ x1: 10, y1: 10, x2: 20, y2: 20 },
		]);
	});

	it('should handle horizontal and vertical lines', () => {
		const path = 'M 10 10 H 20 V 30';
		const segments = svgPathToSegments(path);
		expect(segments).toEqual([
			{ x1: 10, y1: 10, x2: 20, y2: 10 },
			{ x1: 20, y1: 10, x2: 20, y2: 30 },
		]);
	});

	it('should handle the close path (Z) command', () => {
		const path = 'M 10 10 L 20 10 L 20 20 Z';
		const segments = svgPathToSegments(path);
		expect(segments).toEqual([
			{ x1: 10, y1: 10, x2: 20, y2: 10 },
			{ x1: 20, y1: 10, x2: 20, y2: 20 },
			// The close command draws a segment back to the starting point.
			{ x1: 20, y1: 20, x2: 10, y2: 10 },
		]);
	});

	it('should approximate cubic bezier curves', () => {
		const path = 'M 10 10 C 20 20 30 20 40 10';
		const segments = svgPathToSegments(path);
		// Since the cubic curve is subdivided into multiple segments,
		// we expect more than one segment.
		expect(segments.length).toBeGreaterThan(1);

		// Check that the approximation starts at (10,10)
		expect(segments[0].x1).toBeCloseTo(10, 5);
		expect(segments[0].y1).toBeCloseTo(10, 5);

		// Check that the approximation ends at (40,10)
		const lastSegment = segments[segments.length - 1];
		expect(lastSegment.x2).toBeCloseTo(40, 5);
		expect(lastSegment.y2).toBeCloseTo(10, 5);
	});

	it('should approximate quadratic bezier curves', () => {
		const path = 'M 10 10 Q 20 20 30 10';
		const segments = svgPathToSegments(path);
		expect(segments.length).toBeGreaterThan(1);

		// Check that the approximation starts at (10,10)
		expect(segments[0].x1).toBeCloseTo(10, 5);
		expect(segments[0].y1).toBeCloseTo(10, 5);

		// And that it ends at (30,10)
		const lastSegment = segments[segments.length - 1];
		expect(lastSegment.x2).toBeCloseTo(30, 5);
		expect(lastSegment.y2).toBeCloseTo(10, 5);
	});

	it('should approximate arcs', () => {
		// This arc command goes from (10,10) to (20,10) with radii of 10.
		const path = 'M 10 10 A 10 10 0 0 1 20 10';
		const segments = svgPathToSegments(path);
		expect(segments.length).toBeGreaterThan(1);

		// Verify that the arc approximation starts at (10,10)
		expect(segments[0].x1).toBeCloseTo(10, 5);
		expect(segments[0].y1).toBeCloseTo(10, 5);

		// And ends at (20,10)
		const lastSegment = segments[segments.length - 1];
		expect(lastSegment.x2).toBeCloseTo(20, 5);
		expect(lastSegment.y2).toBeCloseTo(10, 5);
	});

	it('should handle triangles', () => {
		// This arc command goes from (10,10) to (20,10) with radii of 10.
		const path = 'M 152.982 124.448 L 176.73 156.849 L 129.234 156.849 L 152.982 124.448 Z';
		const segments = svgPathToSegments(path);
		expect(segments.length).toBe(3);

		// Verify first point of triangle
		expect(segments[2].x2).toBeCloseTo(152.982, 5);
		expect(segments[2].y2).toBeCloseTo(124.448, 5);

		expect(segments[0].x1).toBeCloseTo(152.982, 5);
		expect(segments[0].y1).toBeCloseTo(124.448, 5);

		// Verify second point of triangle
		expect(segments[0].x2).toBeCloseTo(176.73, 5);
		expect(segments[0].y2).toBeCloseTo(156.849, 5);

		expect(segments[1].x1).toBeCloseTo(176.73, 5);
		expect(segments[1].y1).toBeCloseTo(156.849, 5);

		// Verify third point of triangle
		expect(segments[1].x2).toBeCloseTo(129.234, 5);
		expect(segments[1].y2).toBeCloseTo(156.849, 5);

		expect(segments[2].x1).toBeCloseTo(129.234, 5);
		expect(segments[2].y1).toBeCloseTo(156.849, 5);
	});
});
