import {Arc, Circle, Point, Ray, Segment, Vector} from '@flatten-js/core';
import {describe, expect, test} from 'vitest';
import {isPointInsideBoundary} from './is-point-inside-boundary';

describe('isPointInsideBoundary', () => {
	/*
	   (0,10) +-----------+ (10,10)
			  |           |
			  |     X     |   ← point (5,5)
			  |           |
	   (0,0)  +-----------+ (10,0)
	*/
	test('returns true for a point strictly inside a square boundary', () => {
		const square: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(10, 10)),
			new Segment(new Point(10, 10), new Point(0, 10)),
			new Segment(new Point(0, 10), new Point(0, 0)),
		];
		const pt = new Point(5, 5);
		expect(isPointInsideBoundary(square, pt)).toBe(true);
	});

	/*
	   (0,10) +-----------+ (10,10)
			  |           |
			  |           |
			  |           |
	   (0,0)  +-----------+ (10,0) X
							       ↑ outside at (15,5)
	*/
	test('returns false for a point outside a square boundary', () => {
		const square: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(10, 10)),
			new Segment(new Point(10, 10), new Point(0, 10)),
			new Segment(new Point(0, 10), new Point(0, 0)),
		];
		const pt = new Point(15, 5);
		expect(isPointInsideBoundary(square, pt)).toBe(false);
	});

	/*
	   (0,10) +-----------+ (10,10)
			  |           |
			  |           |
			  |           |
	   (0,0)  +----X------+ (10,0)
				 (5,0) on bottom edge
	*/
	test('returns true for a point exactly on a boundary segment', () => {
		const square: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(10, 10)),
			new Segment(new Point(10, 10), new Point(0, 10)),
			new Segment(new Point(0, 10), new Point(0, 0)),
		];
		const pt = new Point(5, 0);
		expect(isPointInsideBoundary(square, pt)).toBe(true);
	});

	/*
		  (0,10)
			*--__
			|      \
			|    x   \   <- inside at (5,5)
			|        |
	   (0,0)*---------+ (10,0)
	*/
	test('returns true for a point inside a quarter‐circle boundary', () => {
		const quarterCircle: (Segment | Arc)[] = [
			new Arc(new Point(0, 0), 10, 0, Math.PI / 2, true),
			new Segment(new Point(0, 10), new Point(0, 0)),
			new Segment(new Point(0, 0), new Point(10, 0)),
		];
		const pt = new Point(5, 5);
		expect(isPointInsideBoundary(quarterCircle, pt)).toBe(true);
	});

	/*
		  (0,10)
			*--__     x  <- outside at (9,9)
			|      \
			|        \
			|         |
	   (0,0)*---------+ (10,0)
	*/
	test('returns false for a point outside a quarter‐circle boundary', () => {
		const quarterCircle: (Segment | Arc)[] = [
			new Arc(new Point(0, 0), 10, 0, Math.PI / 2, true),
			new Segment(new Point(0, 10), new Point(0, 0)),
			new Segment(new Point(0, 0), new Point(10, 0)),
		];
		const pt = new Point(9, 9);
		expect(isPointInsideBoundary(quarterCircle, pt)).toBe(false);
	});

	/*
		  (0,10)
			*--
			|  ---
			|     ---(10, 5)  x <- outside (12,5)
			|  ---
	        *--
	      (0,0)
	*/
	test('returns false for a point outside a triangle boundary', () => {
		const triangle: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(10, 5)),
			new Segment(new Point(0, 0), new Point(0, 10)),
			new Segment(new Point(0, 10), new Point(10, 5)),
		];
		const pt = new Point(12, 5);
		expect(isPointInsideBoundary(triangle, pt)).toBe(false);
	});

	/*
		  (0,10)        (10,10)
			*-----------*
			|           |
			|           |
			|  X   *    |
			|      | \  |
			|      |  \ |
	        *------*    *
	      (0,0)  (5,0)  (10,0)
	*/
	test('returns true for a point inside a non convex boundary', () => {
		const boundary: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(5, 0)),
			new Segment(new Point(5, 0), new Point(5, 5)),
			new Segment(new Point(5, 5), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(10, 10)),
			new Segment(new Point(0, 10), new Point(10, 10)),
			new Segment(new Point(0, 0), new Point(0, 10)),
		];
		const pt = new Point(2.5, 5);
		expect(isPointInsideBoundary(boundary, pt)).toBe(true);
	});

	/*
		  (0,10)        (10,10)
			*-----------*
			|           |
			|           |
			|      *    |
			|      | \  |
			|      |  \ |
	        *------* X  *
	      (0,0)  (5,0)  (10,0)
	*/
	test('returns false for a point outside a non convex boundary', () => {
		const boundary: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(5, 0)),
			new Segment(new Point(5, 0), new Point(5, 5)),
			new Segment(new Point(5, 5), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(10, 10)),
			new Segment(new Point(10, 10), new Point(0, 10)),
			new Segment(new Point(0, 10), new Point(0, 0)),
		];
		const pt = new Point(7.5, 0.5);
		expect(isPointInsideBoundary(boundary, pt)).toBe(false);
	});

	/*
		  (0,10)
			*
			| \
			|   \
			|     \  (2.5,2.5)
			|  X    \
			|         \
	        *----------*
	      (0,0)        (10,0)
	*/
	test('returns true for a point inside a triangle', () => {
		const boundary: (Segment | Arc)[] = [
			new Segment(new Point(0, 0), new Point(10, 0)),
			new Segment(new Point(10, 0), new Point(0, 10)),
			new Segment(new Point(0, 10), new Point(0, 0)),
		];
		const pt = new Point(2.5, 2.5);
		expect(isPointInsideBoundary(boundary, pt)).toBe(true);
	});

	/*
       		    X
		          ‾ -_
	                   ‾-_
	        *--------------X---* (0, 0)
	                         ‾ -_
	                              ‾ -_
	*/
	test('returns intersection for ray and segment', () => {
		const segment = new Segment(new Point(0, 0), new Point(1, 0));
		const ray = new Ray(new Point(0.5, 0.3), new Vector(0.7403263385994381, 0.6722476570252589));
		const intersection = ray.intersect(segment);
		expect(intersection[0]).toBeDefined();
		expect(intersection[0].x).toBeCloseTo(0.7724127004438455, 2);
		expect(intersection[0].y).toBeCloseTo(0, 2);
	});

	test('returns intersection for ray and circle', () => {
		const circle = new Circle(new Point(0, 0), 1);
		const ray = new Ray(new Point(0.5, 0.3), new Vector(0.7403263385994381, 0.6722476570252589));
		const intersection = ray.intersect(circle);
		expect(intersection[0]).toBeDefined();
		expect(intersection[0].x).toBeCloseTo(0.9748360893612906, 2);
		expect(intersection[0].y).toBeCloseTo(-0.22292285409707496, 2);
	});
});
