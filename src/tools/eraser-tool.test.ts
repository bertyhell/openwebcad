import {type Arc, Point} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import {TO_DEGREES, TO_RADIANS} from '../App.consts.ts';
import type {ArcEntity} from '../entities/ArcEntity.ts';
import {CircleEntity} from '../entities/CircleEntity.ts';
import {EntityName} from '../entities/Entity.ts';
import {RectangleEntity} from '../entities/RectangleEntity.ts';
import {getEntities, setEntities} from '../state.ts';
import {eraseCircleSegment, getAllIntersectionPoints,} from './eraser-tool.helpers.ts';
import {handleMouseClick} from './eraser-tool.ts';

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
			new RectangleEntity('layer1', new Point(0, 0), new Point(20, -20)),
			new CircleEntity('layer1', new Point(0, 0), 10),
		];
		setEntities(entities);
		handleMouseClick(new Point(8, -8));
		const entitiesAfterErase = getEntities();
		expect(entitiesAfterErase[0].getType()).toEqual(EntityName.Rectangle);
		expect(entitiesAfterErase[1].getType()).toEqual(EntityName.Arc);
		const arc = (entitiesAfterErase[1] as ArcEntity).getShape() as Arc;
		expect(arc.center).toEqual(new Point(0, 0));
		expect(arc.r).toEqual(10);
		expect(arc.startAngle * TO_DEGREES).toEqual(0);
		expect(arc.endAngle * TO_DEGREES).toEqual(270);
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
			new RectangleEntity('layer1', new Point(0, 0), new Point(20, -20)),
			new CircleEntity('layer1', new Point(0, 0), 10),
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
