import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { LineEntity } from '../entities/LineEntity.ts';
import { getAlignedEntities } from './align-tools.ts';
import { getPointAtDistanceTowards, moveEntities } from './move-tool.helpers.ts';
import { getPointAtAngle, rotateEntities } from './rotate-tool.helpers.ts';
import { getPointForScaleFactor, scaleEntities } from './scale-tool.helpers.ts';
import { combineSelection } from './select-tool.helpers.ts';
import { getTransformedClones, replaceEntities } from './transform-tool.helpers.ts';

function expectPoint(point: Point | null, x: number, y: number) {
	expect(point?.x).toBeCloseTo(x);
	expect(point?.y).toBeCloseTo(y);
}

describe('getTransformedClones', () => {
	it('transforms clones and keeps the originals untouched', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.lineColor = '#00ff00';
		const [movedLine] = getTransformedClones(
			[line],
			[new Point(0, 0), new Point(5, 5)],
			(entities, [start, end]) => moveEntities(entities, end.x - start.x, end.y - start.y)
		) as LineEntity[];

		expectPoint(movedLine.getStartPoint(), 5, 5);
		expectPoint(line.getStartPoint(), 0, 0);
		expect(movedLine.lineColor).toBe('#00ff00');
	});
});

describe('replaceEntities', () => {
	it('keeps the order and the ids of the replaced entities', () => {
		const lineA = new LineEntity(new Point(0, 0), new Point(1, 0));
		const lineB = new LineEntity(new Point(0, 1), new Point(1, 1));
		const lineC = new LineEntity(new Point(0, 2), new Point(1, 2));
		const replacement = lineB.clone();

		const result = replaceEntities([lineA, lineB, lineC], [lineB], [replacement]);

		expect(result).toEqual([lineA, replacement, lineC]);
		expect(result[1].id).toBe(lineB.id);
	});
});

describe('typed transform values', () => {
	it('moves a typed distance towards the mouse', () => {
		expectPoint(getPointAtDistanceTowards(new Point(0, 0), new Point(3, 4), 10), 6, 8);
		expect(getPointAtDistanceTowards(new Point(1, 1), new Point(1, 1), 10)).toBeNull();
	});

	it('rotates by a typed angle counterclockwise', () => {
		const origin = new Point(0, 0);
		const startPoint = new Point(10, 0);
		const endPoint = getPointAtAngle(origin, startPoint, 90);
		expectPoint(endPoint, 0, 10);

		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		rotateEntities([line], origin, startPoint, endPoint);
		expectPoint(line.getEndPoint(), 0, 10);
	});

	it('scales by a typed factor', () => {
		const origin = new Point(0, 0);
		const referencePoint = new Point(10, 0);
		const newPoint = getPointForScaleFactor(origin, referencePoint, 2);
		expectPoint(newPoint, 20, 0);

		const line = new LineEntity(new Point(0, 0), new Point(5, 5));
		scaleEntities([line], origin, referencePoint, newPoint);
		expectPoint(line.getEndPoint(), 10, 10);
	});

	it('does not scale with a zero reference length', () => {
		const line = new LineEntity(new Point(0, 0), new Point(5, 5));
		scaleEntities([line], new Point(1, 1), new Point(1, 1), new Point(4, 4));
		expectPoint(line.getEndPoint(), 5, 5);
	});
});

describe('getAlignedEntities', () => {
	it('aligns the left side of every entity with the left of the selection', () => {
		const lineA = new LineEntity(new Point(0, 0), new Point(10, 0));
		const lineB = new LineEntity(new Point(5, 5), new Point(20, 5));
		const aligned = getAlignedEntities([lineA, lineB], (entityBox, selectionBox) => [
			selectionBox.minX - entityBox.xmin,
			0,
		]) as LineEntity[];

		expectPoint(aligned[1].getStartPoint(), 0, 5);
		// The originals are not modified, so the alignment can be undone
		expectPoint(lineB.getStartPoint(), 5, 5);
	});
});

describe('combineSelection', () => {
	it('replaces the selection without modifiers', () => {
		expect(combineSelection(['a', 'b'], ['c'], false, false)).toEqual(['c']);
	});

	it('adds to the selection with shift', () => {
		expect(combineSelection(['a', 'b'], ['b', 'c'], false, true)).toEqual(['a', 'b', 'c']);
	});

	it('toggles the selection with ctrl', () => {
		expect(combineSelection(['a', 'b'], ['b', 'c'], true, false)).toEqual(['a', 'c']);
	});
});
