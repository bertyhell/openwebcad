import { type Arc, type Circle, Point, type Polygon, type Segment } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { CornerType, createCorner } from './corner-entities.ts';
import { extendEntity } from './extend-entity.ts';
import { canOffsetEntity, offsetEntity } from './offset-entity.ts';

function expectPoint(point: Point | undefined, x: number, y: number) {
	expect(point?.x).toBeCloseTo(x);
	expect(point?.y).toBeCloseTo(y);
}

describe('offsetEntity', () => {
	it('moves a line parallel to the side of the click', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.lineColor = '#ff0000';
		const above = offsetEntity(line, 5, new Point(3, 8)) as LineEntity;
		expectPoint(above.getStartPoint(), 0, 5);
		expectPoint(above.getEndPoint(), 10, 5);
		expect(above.lineColor).toBe('#ff0000');

		const below = offsetEntity(line, 5, new Point(3, -1)) as LineEntity;
		expectPoint(below.getStartPoint(), 0, -5);
	});

	it('grows or shrinks a circle', () => {
		const circle = new CircleEntity(new Point(0, 0), 10);
		expect((offsetEntity(circle, 2, new Point(20, 0))?.getShape() as Circle).r).toBeCloseTo(12);
		expect((offsetEntity(circle, 2, new Point(1, 0))?.getShape() as Circle).r).toBeCloseTo(8);
		expect(offsetEntity(circle, 12, new Point(1, 0))).toBeNull();
	});

	it('grows or shrinks an arc', () => {
		const arc = new ArcEntity(new Point(0, 0), 10, 0, Math.PI / 2, true);
		const offsetArc = offsetEntity(arc, 3, new Point(20, 20))?.getShape() as Arc;
		expect(offsetArc.r.valueOf()).toBeCloseTo(13);
		expect(offsetArc.startAngle).toBeCloseTo(0);
		expect(offsetArc.endAngle).toBeCloseTo(Math.PI / 2);
	});

	it('offsets a rectangle outwards and inwards', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 10));
		const outside = offsetEntity(rectangle, 1, new Point(20, 20))?.getShape() as Polygon;
		expect(outside.box.xmin).toBeCloseTo(-1);
		expect(outside.box.xmax).toBeCloseTo(11);
		const inside = offsetEntity(rectangle, 1, new Point(5, 5))?.getShape() as Polygon;
		expect(inside.box.xmin).toBeCloseTo(1);
		expect(inside.box.ymax).toBeCloseTo(9);
		expect(offsetEntity(rectangle, 6, new Point(5, 5))).toBeNull();
	});

	it('offsets an open polyline with mitered corners', () => {
		const polyLine = new PolyLineEntity([
			new LineEntity(new Point(0, 0), new Point(10, 0)),
			new LineEntity(new Point(10, 0), new Point(10, 10)),
		]);
		const offsetPolyLine = offsetEntity(polyLine, 1, new Point(5, 5)) as PolyLineEntity;
		const [first, second] = offsetPolyLine.entities as LineEntity[];
		expectPoint(first.getStartPoint(), 0, 1);
		expectPoint(first.getEndPoint(), 9, 1);
		expectPoint(second.getEndPoint(), 9, 10);
	});

	it('does not offset polylines with arcs', () => {
		const polyLine = new PolyLineEntity([new ArcEntity(new Point(0, 0), 1, 0, 1, true)]);
		expect(canOffsetEntity(polyLine)).toBe(false);
	});
});

describe('createCorner', () => {
	const horizontal = new LineEntity(new Point(0, 0), new Point(10, 0));
	const vertical = new LineEntity(new Point(12, 2), new Point(12, 10));

	it('makes a sharp corner with a value of 0', () => {
		const result = createCorner(
			{ line: horizontal, clickPoint: new Point(2, 0) },
			{ line: vertical, clickPoint: new Point(12, 8) },
			CornerType.FILLET,
			0
		);
		if ('error' in result) throw new Error(result.error);
		expectPoint(result.lines[0].getEndPoint(), 12, 0);
		expectPoint(result.lines[1].getEndPoint(), 12, 0);
		expect(result.connector).toBeNull();
		expect(result.lines[0].id).toBe(horizontal.id);
	});

	it('rounds the corner with a fillet arc', () => {
		const result = createCorner(
			{ line: horizontal, clickPoint: new Point(2, 0) },
			{ line: vertical, clickPoint: new Point(12, 8) },
			CornerType.FILLET,
			2
		);
		if ('error' in result) throw new Error(result.error);
		expectPoint(result.lines[0].getEndPoint(), 10, 0);
		expectPoint(result.lines[1].getEndPoint(), 12, 2);
		const arc = result.connector?.getShape() as Arc;
		expectPoint(arc.center, 10, 2);
		expect(arc.r.valueOf()).toBeCloseTo(2);
		expect(arc.length).toBeCloseTo(Math.PI);
	});

	it('cuts the corner with a chamfer line', () => {
		const result = createCorner(
			{ line: horizontal, clickPoint: new Point(2, 0) },
			{ line: vertical, clickPoint: new Point(12, 8) },
			CornerType.CHAMFER,
			3
		);
		if ('error' in result) throw new Error(result.error);
		const chamfer = result.connector?.getShape() as Segment;
		expectPoint(chamfer.start, 9, 0);
		expectPoint(chamfer.end, 12, 3);
	});

	it('reports parallel lines and too large values', () => {
		const parallel = new LineEntity(new Point(0, 5), new Point(10, 5));
		expect(
			createCorner(
				{ line: horizontal, clickPoint: new Point(1, 0) },
				{ line: parallel, clickPoint: new Point(1, 5) },
				CornerType.FILLET,
				1
			)
		).toHaveProperty('error');
		expect(
			createCorner(
				{ line: horizontal, clickPoint: new Point(1, 0) },
				{ line: vertical, clickPoint: new Point(12, 8) },
				CornerType.FILLET,
				50
			)
		).toHaveProperty('error');
	});
});

describe('extendEntity', () => {
	const wall = new LineEntity(new Point(20, -10), new Point(20, 10));

	it('extends the end of a line closest to the click', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const extended = extendEntity(line, new Point(9, 0), [line, wall]) as LineEntity;
		expectPoint(extended.getStartPoint(), 0, 0);
		expectPoint(extended.getEndPoint(), 20, 0);
		expect(extended.id).toBe(line.id);
	});

	it('returns null when there is nothing to extend to', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		expect(extendEntity(line, new Point(1, 0), [line, wall])).toBeNull();
	});

	it('extends an arc along its circle', () => {
		const arc = new ArcEntity(new Point(0, 0), 10, 0, Math.PI / 4, true);
		const boundary = new LineEntity(new Point(-20, 0.0001), new Point(0, 0.0001)).clone();
		const verticalBoundary = new LineEntity(new Point(0, 0), new Point(0, 20));
		const extended = extendEntity(arc, new Point(7, 7), [arc, boundary, verticalBoundary]);
		const extendedArc = extended?.getShape() as Arc;
		expect(extendedArc.endAngle).toBeCloseTo(Math.PI / 2);
		expect(extendedArc.startAngle).toBeCloseTo(0);
	});
});

describe('mirroring arcs', () => {
	it('mirrors an arc over a vertical axis', () => {
		// Quarter arc in the first quadrant, from 0° to 90°
		const arc = new ArcEntity(new Point(10, 0), 5, 0, Math.PI / 2, true);
		arc.mirror(new LineEntity(new Point(0, 0), new Point(0, 10)));
		const shape = arc.getShape() as Arc;
		expectPoint(shape.center, -10, 0);
		// The mirrored arc covers the quadrant from 90° to 180° around its new center
		expect(shape.contains(new Point(-10 - 5 * Math.SQRT1_2, 5 * Math.SQRT1_2))).toBe(true);
		expect(shape.contains(new Point(-10 + 5 * Math.SQRT1_2, 5 * Math.SQRT1_2))).toBe(false);
		expect(shape.length).toBeCloseTo((Math.PI / 2) * 5);
	});
});
