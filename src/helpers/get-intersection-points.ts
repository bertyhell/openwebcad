import type { Point } from '@flatten-js/core';
import type { Entity } from '../entities/Entity';

/**
 * Intersections between every pair of entities in the list
 */
export function getIntersectionPoints(entities: Entity[]): Point[] {
	const intersectionPoints: Point[] = [];

	for (let i = 0; i < entities.length; i++) {
		const entity1 = entities[i];
		// intersections are symmetric, so we only need to calculate them in one direction
		for (let j = i + 1; j < entities.length; j++) {
			intersectionPoints.push(...entity1.getIntersections(entities[j]));
		}
	}

	return intersectionPoints;
}

/**
 * Intersections between every entity of the first list and every entity of the second list
 */
export function getIntersectionPointsBetween(entities1: Entity[], entities2: Entity[]): Point[] {
	const intersectionPoints: Point[] = [];
	for (const entity1 of entities1) {
		for (const entity2 of entities2) {
			intersectionPoints.push(...entity1.getIntersections(entity2));
		}
	}
	return intersectionPoints;
}
