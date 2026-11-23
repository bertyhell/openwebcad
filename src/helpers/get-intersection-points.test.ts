import { Point } from '@flatten-js/core';
import { sortBy } from 'es-toolkit';
import { describe, expect, it } from 'vitest';
import { SnapPointType } from '../App.types.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import type { Entity } from '../entities/Entity.ts';
import { GroupEntity } from '../entities/GroupEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { SplineEntity } from '../entities/SplineEntity.ts';
import { TextEntity } from '../entities/TextEntity.ts';
import { getIntersectionPoints } from './get-intersection-points.ts';
import { getEntitySnapPointIndex } from './snap-point-index.ts';

function polyLine(...points: [number, number][]): PolyLineEntity {
	const lines: LineEntity[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		lines.push(new LineEntity(new Point(...points[i]), new Point(...points[i + 1])));
	}
	return new PolyLineEntity(lines);
}

function sortedCoordinates(points: Point[]): [number, number][] {
	return sortBy(
		points.map((point): [number, number] => [
			Math.round(point.x * 1000) / 1000,
			Math.round(point.y * 1000) / 1000,
		]),
		[(point) => point[0], (point) => point[1]]
	);
}

/**
 * Checks that both orders of the entities give the expected points
 */
function expectIntersections(entity1: Entity, entity2: Entity, expected: [number, number][]) {
	expect(sortedCoordinates(entity1.getIntersections(entity2))).toEqual(expected);
	expect(sortedCoordinates(entity2.getIntersections(entity1))).toEqual(expected);
}

describe('getIntersections', () => {
	const verticalLine = new LineEntity(new Point(5, -10), new Point(5, 10));

	it('intersects a line with a polyline in both directions', () => {
		expectIntersections(verticalLine, polyLine([0, 0], [10, 0], [10, 10]), [[5, 0]]);
	});

	it('intersects two polylines', () => {
		expectIntersections(polyLine([0, 0], [10, 0], [10, 10]), polyLine([5, -5], [5, 5], [15, 5]), [
			[5, 0],
			[10, 5],
		]);
	});

	it('reports a crossing at a polyline corner only once', () => {
		const diagonal = new LineEntity(new Point(5, -5), new Point(15, 5));
		expectIntersections(diagonal, polyLine([0, 0], [10, 0], [10, 10]), [[10, 0]]);
	});

	it('intersects two open splines', () => {
		const spline1 = new SplineEntity([new Point(0, 0), new Point(5, 2), new Point(10, 0)]);
		const spline2 = new SplineEntity([new Point(5, -5), new Point(6, 0), new Point(5, 5)]);
		const intersections = spline1.getIntersections(spline2);
		expect(intersections).toHaveLength(1);
		expect(spline2.getIntersections(spline1)).toHaveLength(1);
		expect(intersections[0].x).toBeGreaterThan(5);
		expect(intersections[0].x).toBeLessThan(6);
	});

	it('intersects a line with the members of a group, including circles', () => {
		const group = new GroupEntity([
			new CircleEntity(new Point(5, 0), 3),
			new LineEntity(new Point(0, 8), new Point(10, 8)),
		]);
		expectIntersections(verticalLine, group, [
			[5, -3],
			[5, 3],
			[5, 8],
		]);
	});

	it('finds nothing for entities without an outline', () => {
		const text = new TextEntity('hello', new Point(5, 0));
		expectIntersections(verticalLine, text, []);
	});

	it('gives the same intersection points regardless of the drawing order', () => {
		const polyLineEntity = polyLine([0, 0], [10, 0]);
		expect(sortedCoordinates(getIntersectionPoints([polyLineEntity, verticalLine]))).toEqual([
			[5, 0],
		]);
		expect(sortedCoordinates(getIntersectionPoints([verticalLine, polyLineEntity]))).toEqual([
			[5, 0],
		]);
	});
});

describe('intersection snap points', () => {
	function getIntersectionSnapPoints(entities: Entity[]): Point[] {
		const index = getEntitySnapPointIndex(entities);
		return [new Point(5, 5), new Point(5, 0), new Point(0, 0), new Point(10, 0), new Point(10, 10)]
			.map((location) =>
				index.getClosestWithinRadius(
					location,
					0.1,
					(snapPoint) => snapPoint.type === SnapPointType.Intersection
				)
			)
			.filter((snapPoint) => !!snapPoint)
			.map((snapPoint) => snapPoint.point);
	}

	it('snaps to crossings between members of a group', () => {
		const group = new GroupEntity([
			new LineEntity(new Point(0, 5), new Point(10, 5)),
			new LineEntity(new Point(5, 0), new Point(5, 10)),
		]);
		expect(sortedCoordinates(getIntersectionSnapPoints([group]))).toEqual([[5, 5]]);
	});

	it('snaps to the point where a polyline crosses itself, but not to its corners', () => {
		const selfCrossing = polyLine([0, 0], [10, 10], [10, 0], [0, 10]);
		expect(sortedCoordinates(getIntersectionSnapPoints([selfCrossing]))).toEqual([[5, 5]]);
	});
});
