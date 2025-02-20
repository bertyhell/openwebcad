import { describe, it, expect } from "vitest";
import { Point } from "@flatten-js/core";
import { mirrorPointOverAxis } from './mirror-point-over-axis';
import {LineEntity} from "../entities/LineEntity.ts";

describe("mirrorPointOverAxis", () => {
	it('should mirror if the axis is horizontal', () => {
		const point = new Point(100, 100);
		const axis = new LineEntity(new Point(0, 50), new Point(50, 50));
		const mirroredPoint = mirrorPointOverAxis(point, axis);
		expect(mirroredPoint.x).toBe(100);
		expect(mirroredPoint.y).toBe(0);
	});

	it("mirrors a point over a vertical axis", () => {
		const point = new Point(3, 4);
		const axis = new LineEntity(new Point(0, -1), new Point(0, 1)); // Vertical line at x=0
		const mirrored = mirrorPointOverAxis(point, axis);
		expect(mirrored.x).toBeCloseTo(-3);
		expect(mirrored.y).toBeCloseTo(4);
	});

	it("mirrors a point over the diagonal line y = x", () => {
		const point = new Point(3, 4);
		const axis = new LineEntity(new Point(0, 0), new Point(1, 1)); // Line y=x
		const mirrored = mirrorPointOverAxis(point, axis);
		// The mirror of (3,4) over y=x is (4,3)
		expect(mirrored.x).toBeCloseTo(4);
		expect(mirrored.y).toBeCloseTo(3);
	});

	it("returns the same point if the point lies on the mirror axis", () => {
		const point = new Point(1, 1);
		const axis = new LineEntity(new Point(0, 0), new Point(2, 2)); // Point (1,1) lies on this line
		const mirrored = mirrorPointOverAxis(point, axis);
		expect(mirrored.x).toBeCloseTo(1);
		expect(mirrored.y).toBeCloseTo(1);
	});

	it("returns the original point when mirrored twice", () => {
		const point = new Point(5, 7);
		const axis = new LineEntity(new Point(2, 3), new Point(8, 11)); // Arbitrary axis
		const mirrored = mirrorPointOverAxis(point, axis);
		const doubleMirrored = mirrorPointOverAxis(mirrored, axis);
		expect(doubleMirrored.x).toBeCloseTo(point.x);
		expect(doubleMirrored.y).toBeCloseTo(point.y);
	});
});
