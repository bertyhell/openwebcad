import type {Point, Segment} from '@flatten-js/core';
import type {Entity} from '../entities/Entity';

export function findClosestEntity<EntityType = Entity>(
	worldPoint: Point,
	entities: Entity[]
): { distance: number; segment: Segment; entity: EntityType } {
	let closestEntity = null;
	let closestDistanceInfo: [number, Segment | null] = [Number.MAX_SAFE_INTEGER, null];
	for (const entity1 of entities) {
		const distanceInfo = entity1.distanceTo(worldPoint);
		if (!distanceInfo) continue;
		if (distanceInfo[0] < closestDistanceInfo[0]) {
			closestDistanceInfo = distanceInfo;
			closestEntity = entity1;
		}
	}

	return {
		distance: closestDistanceInfo[0],
		segment: closestDistanceInfo[1] as Segment,
		entity: closestEntity as EntityType,
	};
}
