import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { SnapPointType } from '../App.types.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { getEntitySnapPointIndex, SnapPointIndex } from './snap-point-index.ts';

describe('SnapPointIndex', () => {
	const index = new SnapPointIndex(
		[
			[0, 0],
			[10, 10],
			[11, 0],
			[12, 3],
			[50, 50],
		].map(([x, y]) => ({ point: new Point(x, y), type: SnapPointType.Point }))
	);

	it('finds the closest point within the radius', () => {
		expect(index.getClosestWithinRadius(new Point(11, 2), 5)?.point).toEqual(new Point(12, 3));
	});

	it('ignores points that are close in x but far in y', () => {
		expect(index.getClosestWithinRadius(new Point(10, 30), 5)).toBeNull();
	});

	it('returns null when nothing is close enough', () => {
		expect(index.getClosestWithinRadius(new Point(30, 30), 5)).toBeNull();
	});
});

describe('getEntitySnapPointIndex', () => {
	it('includes the intersections and caches the index per list of entities', () => {
		const entities = [
			new LineEntity(new Point(-10, 0), new Point(30, 0)),
			new LineEntity(new Point(0, -10), new Point(0, 30)),
		];
		const index = getEntitySnapPointIndex(entities);

		expect(index.getClosestWithinRadius(new Point(0.5, 0.5), 1)?.type).toBe(
			SnapPointType.Intersection
		);
		expect(getEntitySnapPointIndex(entities)).toBe(index);
		expect(getEntitySnapPointIndex([...entities])).not.toBe(index);
	});
});
