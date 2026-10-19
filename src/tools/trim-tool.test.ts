import { type Arc, Point, type Segment } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { TO_DEGREES, TO_RADIANS } from '../App.consts.ts';
import type { ArcEntity } from '../entities/ArcEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { EntityName } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { getEntities, setEntities } from '../state.ts';
import { eraseCircleSegment, getAllIntersectionPoints } from './trim-tool.helpers.ts';
import { getTrimResult, handleMouseClick } from './trim-tool.ts';

describe('erase-tool', () => {
	/**
	 *                   ---
	 *              ---      ---
	 *            --            --
	 *           -         -------------------------
	 *            --      |                       |
	 *              ---   |     x                 |
	 *                  --|                       |
	 *                    |                       |
	 *                    |                       |
	 *                    |                       |
	 *                    |                       |
	 *                    -------------------------
	 */
	it('should delete part of circle to form an arc', () => {
		const entities = [
			new RectangleEntity(new Point(0, 0), new Point(20, -20)),
			new CircleEntity(new Point(0, 0), 10),
		];
		setEntities(entities);
		handleMouseClick(new Point(8, -8), 2);
		const entitiesAfterErase = getEntities();
		expect(entitiesAfterErase[0].getType()).toEqual(EntityName.Rectangle);
		expect(entitiesAfterErase[1].getType()).toEqual(EntityName.Arc);
		const arc = (entitiesAfterErase[1] as ArcEntity).getShape() as Arc;
		expect(arc.center).toEqual(new Point(0, 0));
		expect(arc.r).toEqual(10);
		expect(arc.startAngle * TO_DEGREES).toEqual(0);
		expect(arc.endAngle * TO_DEGREES).toEqual(270);
	});
	it('should not trim anything when the mouse is further than the max distance from any entity', () => {
		const entities = [
			new RectangleEntity(new Point(0, 0), new Point(20, -20)),
			new CircleEntity(new Point(0, 0), 10),
		];
		setEntities(entities);
		handleMouseClick(new Point(5, -5), 1);
		const entitiesAfterErase = getEntities();
		expect(entitiesAfterErase).toHaveLength(2);
		expect(entitiesAfterErase[0].getType()).toEqual(EntityName.Rectangle);
		expect(entitiesAfterErase[1].getType()).toEqual(EntityName.Circle);
	});

	it('should return the removed part of a line without changing the entities', () => {
		const entities = [
			new LineEntity(new Point(0, 0), new Point(20, 0)),
			new LineEntity(new Point(10, -5), new Point(10, 5)),
		];
		setEntities(entities);
		const trimResult = getTrimResult(new Point(15, 0.5), 1);
		expect(getEntities()).toEqual(entities);
		expect(trimResult?.removed).toHaveLength(1);
		const removedSegment = trimResult?.removed[0].getShape() as Segment;
		expect(removedSegment.start).toEqual(new Point(10, 0));
		expect(removedSegment.end).toEqual(new Point(20, 0));
		expect(trimResult?.remaining).toHaveLength(1);
	});

	/**
	 *                   ---
	 *              ---      ---
	 *            --            --
	 *           -         -------------------------
	 *            --      |                       |
	 *              ---   |     x                 |
	 *                  --|                       |
	 *                    |                       |
	 *                    |                       |
	 *                    |                       |
	 *                    |                       |
	 *                    -------------------------
	 */
	it('should delete part of circle to form an arc using inner functions', () => {
		const entities = [
			new RectangleEntity(new Point(0, 0), new Point(20, -20)),
			new CircleEntity(new Point(0, 0), 10),
		];
		setEntities(entities);

		const intersections = getAllIntersectionPoints(entities[1], getEntities());
		expect(intersections[0]).toEqual(new Point(0, -10));
		expect(intersections[1]).toEqual(new Point(10, 0));

		eraseCircleSegment(
			entities[1] as CircleEntity,
			new Point(10 * Math.cos(-45 * TO_RADIANS), 10 * Math.sin(-45 * TO_RADIANS)),
			intersections
		);

		const entitiesAfterErase = getEntities();
		expect(entitiesAfterErase[0].getType()).toEqual(EntityName.Rectangle);
		expect(entitiesAfterErase[1].getType()).toEqual(EntityName.Arc);
		const arc = (entitiesAfterErase[1] as ArcEntity).getShape() as Arc;
		expect(arc.center).toEqual(new Point(0, 0));
		expect(arc.r).toEqual(10);
		expect(arc.startAngle * TO_DEGREES).toEqual(0);
		expect(arc.endAngle * TO_DEGREES).toEqual(270);
	});
});
