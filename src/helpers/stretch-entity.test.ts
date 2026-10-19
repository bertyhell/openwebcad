import { Box, Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { EntityName } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { stretchEntity } from './stretch-entity.ts';

function expectPoint(point: Point | null | undefined, x: number, y: number) {
	expect(point?.x).toBeCloseTo(x);
	expect(point?.y).toBeCloseTo(y);
}

const box = new Box(5, -5, 15, 5);

describe('stretchEntity', () => {
	it('moves only the end point of a line that is inside the box', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const stretched = stretchEntity(line, box, 5, 2) as LineEntity;
		expectPoint(stretched.getStartPoint(), 0, 0);
		expectPoint(stretched.getEndPoint(), 15, 2);
		expectPoint(line.getEndPoint(), 10, 0);
	});

	it('keeps the other end of an arc', () => {
		const arc = new ArcEntity(new Point(5, 0), 5, Math.PI, 0, false);
		const stretched = stretchEntity(arc, box, 5, 0) as ArcEntity;
		expectPoint(stretched.getStartPoint(), 0, 0);
		expectPoint(stretched.getEndPoint(), 15, 0);
	});

	it('turns a rectangle with some corners inside the box into a polyline', () => {
		const rectangle = new RectangleEntity(new Point(0, -2), new Point(10, 2));
		const stretched = stretchEntity(rectangle, box, 5, 0);
		expect(stretched.getType()).toBe(EntityName.PolyLine);
		expect(stretched.getBoundingBox().xmax).toBeCloseTo(15);
		expect(stretched.getBoundingBox().xmin).toBeCloseTo(0);
	});

	it('moves an entity that is completely inside the box', () => {
		const circle = new CircleEntity(new Point(10, 0), 1);
		expectPoint((stretchEntity(circle, box, 0, 3) as CircleEntity).getCenter(), 10, 3);
	});

	it('leaves a circle that is only partly inside the box', () => {
		const circle = new CircleEntity(new Point(5, 0), 3);
		expectPoint((stretchEntity(circle, box, 0, 3) as CircleEntity).getCenter(), 5, 0);
	});
});
