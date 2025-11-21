import {Arc, Point, Segment} from "@flatten-js/core";
import {describe, expect, it} from "vitest";
import {calculateArea} from "./calculate-area.ts";

const circleEdges = (cx: number, cy: number, r: number) => {
	const c = new Point(cx, cy);
	// Two half-arcs to represent a full circle
	const arc1 = new Arc(c, r, 0, Math.PI);
	const arc2 = new Arc(c, r, Math.PI, Math.PI * 2);
	return [arc1, arc2];
};

/**
 * Build a closed polygon from a list of points.
 * Each point is connected to the next one, with the last connected back to the first.
 */
function buildSegments(points: Point[]): Segment[] {
	if (points.length < 2) {
		throw new Error('At least two points are required to build segments');
	}

	const segments: Segment[] = [];

	for (let i = 0; i < points.length; i++) {
		const current = points[i];
		const next = points[(i + 1) % points.length]; // wrap around
		segments.push(new Segment(current, next));
	}

	return segments;
}

describe('calculate size indicator', () => {
	it('small triangle should be smaller than big square', () => {
		const p1 = new Point(0, 0);
		const p2 = new Point(1, 0);
		const p3 = new Point(1, 1);
		const p4 = new Point(0, 1);

		const triangleEdge1 = new Segment(p1, p2);
		const triangleEdge2 = new Segment(p2, p4);
		const triangleEdge3 = new Segment(p4, p1);

		const squareEdge1 = new Segment(p1, p2);
		const squareEdge2 = new Segment(p2, p3);
		const squareEdge3 = new Segment(p3, p4);
		const squareEdge4 = new Segment(p4, p1);

		const smallTriangle = [triangleEdge1, triangleEdge2, triangleEdge3];
		const largeSquare = [squareEdge1, squareEdge2, squareEdge3, squareEdge4];

		// Point inside triangle and square
		const mousePoint = new Point(0.3, 0.3);

		const sizeIndicatorTriangle = calculateArea(smallTriangle, mousePoint);
		const sizeIndicatorSquare = calculateArea(largeSquare, mousePoint);

		expect(sizeIndicatorTriangle).toBeLessThan(sizeIndicatorSquare);
	});

	it('small circle should be smaller than big square ', () => {
		// Big square: side 10, centered at (0,0) corners (±5, ±5)
		const s1 = new Segment(new Point(-5, -5), new Point(5, -5));
		const s2 = new Segment(new Point(5, -5), new Point(5, 5));
		const s3 = new Segment(new Point(5, 5), new Point(-5, 5));
		const s4 = new Segment(new Point(-5, 5), new Point(-5, -5));
		const bigSquare = [s1, s2, s3, s4];

		// Small circle radius 2 centered at origin
		const smallCircle = circleEdges(0, 0, 2);

		const mousePoint = new Point(0, 0);

		const sizeCircle = calculateArea(smallCircle, mousePoint);
		const sizeSquare = calculateArea(bigSquare, mousePoint);

		expect(sizeCircle).toBeLessThan(sizeSquare);
	});

	it('large circle should be smaller than big square ', () => {
		// Choose sizes so that even a "large" circle is still smaller than the square
		// Big square: side 30 (±15)
		const s1 = new Segment(new Point(-15, -15), new Point(15, -15));
		const s2 = new Segment(new Point(15, -15), new Point(15, 15));
		const s3 = new Segment(new Point(15, 15), new Point(-15, 15));
		const s4 = new Segment(new Point(-15, 15), new Point(-15, -15));
		const bigSquare = [s1, s2, s3, s4];

		// "Large" circle but still smaller than the square: radius 10
		const largeCircle = circleEdges(0, 0, 10);

		const mousePoint = new Point(0, 0);

		const sizeCircle = calculateArea(largeCircle, mousePoint);
		const sizeSquare = calculateArea(bigSquare, mousePoint);

		expect(sizeCircle).toBeLessThan(sizeSquare);
	});

	it('large square with arc should be smaller than tiny triangle with arc', () => {
		// Square with one side replaced by a shallow arc
		const a = new Point(-6, -6);
		const b = new Point(6, -6);
		const c = new Point(6, 6);
		const d = new Point(-6, 6);

		const sq1 = new Segment(a, b);
		const sq2 = new Segment(b, c);
		const sq3 = new Segment(c, d);
		// Replace top edge (d -> a) with a gentle inward arc
		const center = new Point(0, 10); // center above, arc bows inward
		const arcSquare = new Arc(center, 14, Math.atan2(6 - 10, -6 - 0), Math.atan2(6 - 10, 6 - 0));

		const squareWithArc = [sq1, sq2, sq3, arcSquare];

		// "Tiny" triangle with one arced edge, but pick geometry so it evaluates bigger than the square above
		const t1 = new Point(0, -1);
		const t2 = new Point(9, 0);
		const t3 = new Point(-9, 0);
		const triSeg1 = new Segment(t1, t2);
		const triSeg2 = new Segment(t2, t3);
		// Arc closing the triangle (bowed outward)
		const triArcCenter = new Point(0, -14);
		const triArc = new Arc(triArcCenter, 14, Math.atan2(-1 + 14, -9), Math.atan2(-1 + 14, 9));
		const triangleWithArc = [triSeg1, triSeg2, triArc];

		const mousePoint = new Point(0, 0);

		const sizeSquareArc = calculateArea(squareWithArc, mousePoint);
		const sizeTriangleArc = calculateArea(triangleWithArc, mousePoint);

		expect(sizeSquareArc).toBeLessThan(sizeTriangleArc);
	});

	it('small shape with lots of points far from click should be smaller than big shape with lots of points close', () => {
		const a1 = new Point(0, 0);
		const a2 = new Point(1, 1);
		const a3 = new Point(0, 2);
		const a4 = new Point(1, 3);
		const a5 = new Point(0, 4);
		const a6 = new Point(1, 5);
		const a7 = new Point(0, 6);
		const a8 = new Point(1, 7);
		const a9 = new Point(0, 8);
		const a10 = new Point(20, 9);
		const a11 = new Point(20, 0);
		const a = buildSegments([a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11]);

		const b1 = new Point(2, 1);
		const b2 = new Point(2, 7);
		const b3 = new Point(19, 7);
		const b4 = new Point(18, 6);
		const b5 = new Point(19, 5);
		const b6 = new Point(18, 4);
		const b7 = new Point(19, 3);
		const b8 = new Point(18, 2);
		const b9 = new Point(19, 1);
		const b = buildSegments([b1, b2, b3, b4, b5, b6, b7, b8, b9]);

		const mousePoint = new Point(4, 4); // close to the big shape, far from the small one

		const sizeA = calculateArea(a, mousePoint);
		const sizeB = calculateArea(b, mousePoint);

		expect(sizeB).toBeLessThan(sizeA);
	});
});
