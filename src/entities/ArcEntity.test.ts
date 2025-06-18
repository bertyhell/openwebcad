import {type Arc, Point} from '@flatten-js/core';
import {describe, expect, it} from 'vitest';
import {EPSILON} from "../App.consts.ts";
import {ArcEntity} from './ArcEntity.ts';

describe('ArcEntity.distanceTo', () => {
	/**
	 *         ---X---
	 *    -----       -----
	 *  --                 --
	 */
	it('distance to point on arc', () => {
		const arc = new ArcEntity('layer1', new Point(0, 0), 1, Math.PI / 4, (3 * Math.PI) / 4, true);
		const point = (arc.getShape() as Arc).pointAtLength(
			(arc.getShape() as Arc).length / 2
		) as Point;
		const distanceInfo = arc.distanceTo(point);
		expect(distanceInfo).toBeDefined();
		if (!distanceInfo) return;
		expect(distanceInfo[0]).to.equal(0);
	});

	/**
	 *         -------         X
	 *    -----       -----
	 *  --                 --
	 */
	it('distance to point outside arc', () => {
		const arc = new ArcEntity('layer1', new Point(0, 0), 1, Math.PI / 4, (3 * Math.PI) / 4, true);
		const point = new Point(2, 2);
		const distanceInfo = arc.distanceTo(point);
		expect(distanceInfo).toBeDefined();
		if (!distanceInfo) return;
		expect(distanceInfo[0]).to.be.closeTo(Math.sqrt(2 * 2 + 2 * 2) - 1, EPSILON);
	});

	/**
	 *         -------
	 *    -----       -----
	 *  --                 --
	 * -             X       -
	 */
	it('distance to point inside arc', () => {
		const arc = new ArcEntity('layer1', new Point(0, 0), 1, Math.PI / 4, (3 * Math.PI) / 4, true);
		const point = new Point(0.5, 0.5);
		const distanceInfo = arc.distanceTo(point);
		expect(distanceInfo).toBeDefined();
		if (!distanceInfo) return;
		expect(distanceInfo[0]).to.be.closeTo(1 - Math.sqrt(0.5 * 0.5 + 0.5 * 0.5), EPSILON);
	});

	it('should return distance from a point to an arc', () => {
		const arc = new ArcEntity('layer1', new Point(20, 20), 20, 0, 2 * Math.PI * 0.75, true);
		const distanceInfo = arc.distanceTo(new Point(20 - 14.14, 20 + 14.14));
		expect(distanceInfo).toBeDefined();
		if (!distanceInfo) return;
		expect(distanceInfo[0]).toBeLessThan(1);
	});
});
