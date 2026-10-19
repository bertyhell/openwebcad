import { type Arc, type Circle, Point, type Polygon, type Segment } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import type { Entity } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import {
	applyCorner,
	CornerType,
	createCorner,
	createCornersAtSharedPoints,
	getCornerTarget,
} from './corner-entities.ts';
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

describe('applyCorner', () => {
	function chamfer(
		firstEntity: Entity,
		firstClick: Point,
		secondEntity: Entity,
		secondClick: Point,
		entities: Entity[]
	) {
		const first = getCornerTarget(firstEntity, firstClick);
		const second = getCornerTarget(secondEntity, secondClick);
		if (!first || !second) throw new Error('No corner target');
		const corner = createCorner(first, second, CornerType.CHAMFER, 2);
		if ('error' in corner) throw new Error(corner.error);
		return applyCorner(entities, first, second, corner);
	}

	it('chamfers two adjacent sides of a rectangle into a polyline', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 10));
		const result = chamfer(rectangle, new Point(5, 0), rectangle, new Point(0, 5), [rectangle]);
		expect(result).toHaveLength(1);
		const polyLine = result[0] as PolyLineEntity;
		expect(polyLine).toBeInstanceOf(PolyLineEntity);
		expect(polyLine.id).toBe(rectangle.id);
		expect(polyLine.numberOfSegments()).toBe(5);
		const hasPoint = (x: number, y: number) =>
			polyLine.getSnapPoints().some((snap) => snap.point.equalTo(new Point(x, y)));
		expect(hasPoint(0, 0)).toBe(false);
		expect(hasPoint(2, 0)).toBe(true);
		expect(hasPoint(0, 2)).toBe(true);
	});

	it('explodes a rectangle when chamfering it with a line', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 10));
		const line = new LineEntity(new Point(20, 5), new Point(30, 5));
		const result = chamfer(rectangle, new Point(10, 2), line, new Point(28, 5), [rectangle, line]);
		// 4 rectangle sides, the line and the chamfer
		expect(result).toHaveLength(6);
		expect(result.filter((entity) => entity.id === line.id)).toHaveLength(1);
		expect(result.some((entity) => entity.id === rectangle.id)).toBe(false);
	});

	it('ignores the arcs of a polyline', () => {
		const arc = new ArcEntity(new Point(0, 0), 5, 0, Math.PI / 2, true);
		const polyLine = new PolyLineEntity([arc, new LineEntity(new Point(0, 5), new Point(-10, 5))]);
		expect(getCornerTarget(polyLine, new Point(5, 0.1))).toBeNull();
		expect(getCornerTarget(polyLine, new Point(-5, 5))?.segmentIndex).toBe(1);
	});
});

describe('createCornersAtSharedPoints', () => {
	const hasPoint = (entity: Entity, x: number, y: number) =>
		entity.getSnapPoints().some((snap) => snap.point.equalTo(new Point(x, y)));

	it('chamfers all 4 corners of a rectangle', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 10));
		const result = createCornersAtSharedPoints([rectangle], [rectangle], CornerType.CHAMFER, 2);
		expect(result.connectors).toHaveLength(4);
		expect(result.entities).toHaveLength(1);
		const polyLine = result.entities[0] as PolyLineEntity;
		expect(polyLine).toBeInstanceOf(PolyLineEntity);
		expect(polyLine.id).toBe(rectangle.id);
		expect(polyLine.numberOfSegments()).toBe(8);
		expect(hasPoint(polyLine, 0, 0)).toBe(false);
		expect(hasPoint(polyLine, 2, 0)).toBe(true);
		expect(hasPoint(polyLine, 8, 10)).toBe(true);
	});

	it('only makes corners where two lines meet in a point', () => {
		const horizontal = new LineEntity(new Point(0, 0), new Point(10, 0));
		const vertical = new LineEntity(new Point(10, 0), new Point(10, 10));
		const loose = new LineEntity(new Point(20, 0), new Point(30, 0));
		const entities = [horizontal, vertical, loose];
		const result = createCornersAtSharedPoints(entities, entities, CornerType.FILLET, 2);
		expect(result.connectors).toHaveLength(1);
		// The 3 lines and the fillet arc
		expect(result.entities).toHaveLength(4);
		expectPoint(result.entities[0].getSnapPoints()[1].point, 8, 0);
		expect(result.entities[0].id).toBe(horizontal.id);
		expect(result.entities[2]).toBe(loose);
		expect(result.entities[3]).toBeInstanceOf(ArcEntity);
	});

	it('skips corners where the distance does not fit', () => {
		const horizontal = new LineEntity(new Point(0, 0), new Point(3, 0));
		const vertical = new LineEntity(new Point(3, 0), new Point(3, 10));
		const entities = [horizontal, vertical];
		const result = createCornersAtSharedPoints(entities, entities, CornerType.CHAMFER, 5);
		expect(result.connectors).toHaveLength(0);
		expect(result.skippedCount).toBe(1);
		expect(result.entities).toBe(entities);
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
