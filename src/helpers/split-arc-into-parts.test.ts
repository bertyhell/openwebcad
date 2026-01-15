import { Arc, Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { splitArcIntoParts } from './split-arc-into-parts';

describe('splitArcIntoParts', () => {
	const center = new Point(0, 0);
	const radius = 10;
	const start = 0;
	const end = Math.PI; // 180°
	const ccw = true;

	const halfCircleArc = new Arc(center, radius, start, end, ccw);
	const fullCircleArc = new Arc(center, radius, start, end * 2, ccw);

	it('splits an half circle arc into 4 parts', () => {
		const parts = splitArcIntoParts(halfCircleArc, 4);
		expect(parts.length).toBe(4);
	});

	it('splits a full circle arc into 4 parts', () => {
		const parts = splitArcIntoParts(fullCircleArc, 4);
		expect(parts.length).toBe(4);
		expect(parts[0].startAngle).toBeCloseTo(0);
		expect(parts[1].startAngle).toBeCloseTo(Math.PI / 2);
		expect(parts[2].startAngle).toBeCloseTo(Math.PI);
		expect(parts[3].startAngle).toBeCloseTo((Math.PI / 2) * 3);
		expect(parts[3].endAngle).toBeCloseTo(Math.PI * 2);
	});

	it('splits a full circle arc into the 36 parts', () => {
		const parts = splitArcIntoParts(fullCircleArc, 36);
		expect(parts.length).toBe(36);
		expect(parts[0].startAngle).toBeCloseTo(0);
		expect(parts[35].endAngle).toBeCloseTo(Math.PI * 2);
	});

	it('each part should be an Arc instance', () => {
		const parts = splitArcIntoParts(halfCircleArc, 3);
		for (const p of parts) {
			expect(p).toBeInstanceOf(Arc);
		}
	});

	it('splits evenly by angle span', () => {
		const n = 5;
		const parts = splitArcIntoParts(halfCircleArc, n);

		const totalSpan = halfCircleArc.endAngle - halfCircleArc.startAngle;
		const expectedSpan = totalSpan / n;

		parts.forEach((p) => {
			const span = p.endAngle - p.startAngle;
			expect(span).toBeCloseTo(expectedSpan, 10);
		});
	});

	it('reconstructs the original span range', () => {
		const parts = splitArcIntoParts(halfCircleArc, 6);

		expect(parts[0].startAngle).toBeCloseTo(halfCircleArc.startAngle, 10);
		expect(parts[parts.length - 1].endAngle).toBeCloseTo(halfCircleArc.endAngle, 10);
	});

	it('has continuous angles without gaps', () => {
		const n = 7;
		const parts = splitArcIntoParts(halfCircleArc, n);

		for (let i = 0; i < n - 1; i++) {
			expect(parts[i].endAngle).toBeCloseTo(parts[i + 1].startAngle, 10);
		}
	});

	it('keeps the same radius and center', () => {
		const parts = splitArcIntoParts(halfCircleArc, 3);

		parts.forEach((p) => {
			expect(p.r).toEqual(halfCircleArc.r);
			expect(p.center.equalTo(halfCircleArc.center)).toBe(true);
		});
	});

	it('keeps direction (ccw)', () => {
		const parts = splitArcIntoParts(halfCircleArc, 3);
		for (const p of parts) {
			expect(p.counterClockwise).toBe(halfCircleArc.counterClockwise);
		}
	});
});
