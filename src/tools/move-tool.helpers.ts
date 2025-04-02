import type {Entity} from '../entities/Entity';

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
