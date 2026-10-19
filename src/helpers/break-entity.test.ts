import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import type { ArcEntity } from '../entities/ArcEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { EntityName } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import type { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { breakEntity } from './break-entity.ts';

function expectPoint(point: Point | null | undefined, x: number, y: number) {
	expect(point?.x).toBeCloseTo(x);
	expect(point?.y).toBeCloseTo(y);
}

describe('breakEntity', () => {
	it('removes the middle of a line', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.lineColor = '#ff0000';
		const pieces = breakEntity(line, new Point(7, 1), new Point(3, -1)) as LineEntity[];
		expect(pieces).toHaveLength(2);
		expectPoint(pieces[0].getEndPoint(), 3, 0);
		expectPoint(pieces[1].getStartPoint(), 7, 0);
		expect(pieces[1].lineColor).toBe('#ff0000');
	});

	it('shortens a line when a point is at its end', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const pieces = breakEntity(line, new Point(5, 0), new Point(12, 0));
		expect(pieces).toHaveLength(1);
	});

	it('turns a circle into an arc, removing the counterclockwise part from the first to the second point', () => {
		const circle = new CircleEntity(new Point(0, 0), 10);
		const pieces = breakEntity(circle, new Point(10, 0), new Point(0, 10));
		expect(pieces).toHaveLength(1);
		const arc = pieces?.[0] as ArcEntity;
		expect(arc.getType()).toBe(EntityName.Arc);
		expectPoint(arc.getStartPoint(), 0, 10);
		expectPoint(arc.getEndPoint(), 10, 0);
	});

	it('turns a rectangle into an open polyline', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 10));
		const pieces = breakEntity(rectangle, new Point(2, 0), new Point(8, 0));
		expect(pieces).toHaveLength(1);
		const polyLine = pieces?.[0] as PolyLineEntity;
		expect(polyLine.getType()).toBe(EntityName.PolyLine);
		const length = polyLine.getEdges().reduce((sum, edge) => sum + edge.length, 0);
		expect(length).toBeCloseTo(34);
	});
});
