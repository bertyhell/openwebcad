import type { Point } from '@flatten-js/core';
import { type SnapPoint, SnapPointType } from '../App.types';
import type { Entity } from '../entities/Entity';
import { getIntersectionPoints } from './get-intersection-points';

/**
 * Snap points sorted by their x coordinate, so the points near the mouse can be found
 * without checking every snap point of the drawing
 */
export class SnapPointIndex {
	private readonly snapPoints: SnapPoint[];

	constructor(snapPoints: SnapPoint[]) {
		this.snapPoints = [...snapPoints].sort((a, b) => a.point.x - b.point.x);
	}

	public get size(): number {
		return this.snapPoints.length;
	}

	/**
	 * Index of the first snap point with an x coordinate of at least minX
	 */
	private findFirstIndex(minX: number): number {
		let low = 0;
		let high = this.snapPoints.length;
		while (low < high) {
			const middle = (low + high) >>> 1;
			if (this.snapPoints[middle].point.x < minX) {
				low = middle + 1;
			} else {
				high = middle;
			}
		}
		return low;
	}

	/**
	 * Closest snap point that is less than maxDistance away from the location
	 */
	public getClosestWithinRadius(location: Point, maxDistance: number): SnapPoint | null {
		let closestSnapPoint: SnapPoint | null = null;
		let closestDistance = maxDistance;
		for (
			let index = this.findFirstIndex(location.x - maxDistance);
			index < this.snapPoints.length && this.snapPoints[index].point.x <= location.x + maxDistance;
			index++
		) {
			const snapPoint = this.snapPoints[index];
			const distance = Math.hypot(snapPoint.point.x - location.x, snapPoint.point.y - location.y);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestSnapPoint = snapPoint;
			}
		}
		return closestSnapPoint;
	}
}

const snapPointIndexCache = new WeakMap<Entity[], SnapPointIndex>();

/**
 * Snap points of the entities and of the intersections between them
 * Calculating all intersections is expensive, so the result is cached for as long as the list of entities doesn't change
 */
export function getEntitySnapPointIndex(entities: Entity[]): SnapPointIndex {
	const cachedIndex = snapPointIndexCache.get(entities);
	if (cachedIndex) {
		return cachedIndex;
	}
	const index = new SnapPointIndex([
		...entities.flatMap((entity) => entity.getSnapPoints()),
		...getIntersectionPoints(entities).map((point) => ({
			point,
			type: SnapPointType.Intersection,
		})),
	]);
	snapPointIndexCache.set(entities, index);
	return index;
}
