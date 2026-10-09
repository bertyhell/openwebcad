import { Point, Vector } from '@flatten-js/core';
import type { Entity } from '../entities/Entity';

/**
 * Move entities by the difference between the start and end points
 * @param entities
 * @param deltaX
 * @param deltaY
 */
export function moveEntities(entities: Entity[], deltaX: number, deltaY: number) {
	for (const entity of entities) {
		entity.move(deltaX, deltaY);
	}
}

/**
 * Point at a typed distance from the base point, in the direction of the mouse
 * Returns null when the mouse is on top of the base point, since there is no direction
 */
export function getPointAtDistanceTowards(
	basePoint: Point,
	directionPoint: Point,
	distance: number
): Point | null {
	const direction = new Vector(basePoint, directionPoint);
	if (direction.length === 0) {
		return null;
	}
	const offset = direction.normalize().multiply(distance);
	return new Point(basePoint.x + offset.x, basePoint.y + offset.y);
}
