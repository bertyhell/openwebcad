import { Arc, Point, Segment } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { ArcEntity } from './ArcEntity.ts';
import { EntityName } from './Entity.ts';
import { FillEntity } from './FillEntity.ts';
import { LineEntity } from './LineEntity.ts';
import { PolyLineEntity } from './PolyLineEntity.ts';

function createFillWithHole(): FillEntity {
	const p1 = new Point(0, 0);
	const p2 = new Point(10, 0);
	const p3 = new Point(10, 10);
	const p4 = new Point(0, 10);
	const border = new PolyLineEntity([
		new LineEntity(new Segment(p1, p2)),
		new LineEntity(new Segment(p2, p3)),
		new LineEntity(new Segment(p3, p4)),
		new LineEntity(new Segment(p4, p1)),
	]);
	const hole = new PolyLineEntity([
		new ArcEntity(new Arc(new Point(5, 5), 2, 0, 2 * Math.PI, true)),
	]);
	const fillEntity = new FillEntity(border, [hole]);
	fillEntity.fillColor = '#ff0000';
	return fillEntity;
}

describe('FillEntity', () => {
	it('converts to json and back', async () => {
		const fillEntity = createFillWithHole();

		const json = await fillEntity.toJson();
		expect(json?.type).toBe(EntityName.Fill);
		expect(json?.shapeData?.fillColor).toBe('#ff0000');
		expect(json?.shapeData?.holePolylines).toHaveLength(1);

		// Make sure it survives serialization to a string, like when saving to a file
		const parsedJson = JSON.parse(JSON.stringify(json));
		const restoredEntity = await FillEntity.fromJson(parsedJson);

		expect(restoredEntity.id).toBe(fillEntity.id);
		expect(restoredEntity.fillColor).toBe('#ff0000');
		expect(restoredEntity.getEdges()).toHaveLength(5);
		expect(restoredEntity.getBoundingBox().xmax).toBeCloseTo(10);
	});

	it('moves the border and the holes', () => {
		const fillEntity = createFillWithHole();

		fillEntity.move(1, 2);

		const edges = fillEntity.getEdges();
		const arc = edges.find((edge) => edge instanceof Arc) as Arc;
		expect(arc.center.x).toBeCloseTo(6);
		expect(arc.center.y).toBeCloseTo(7);
		expect(fillEntity.getBoundingBox().xmin).toBeCloseTo(1);
		expect(fillEntity.getBoundingBox().ymin).toBeCloseTo(2);
	});

	it('clones the fill color and holes', () => {
		const fillEntity = createFillWithHole();

		const clone = fillEntity.clone();

		expect(clone.id).not.toBe(fillEntity.id);
		expect(clone.fillColor).toBe('#ff0000');
		expect(clone.getEdges()).toHaveLength(5);
	});
});
