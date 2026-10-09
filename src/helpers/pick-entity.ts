import type { Point } from '@flatten-js/core';
import { HIGHLIGHT_ENTITY_DISTANCE } from '../App.consts';
import type { Entity } from '../entities/Entity';
import { getEditableEntities, getScreenCanvasDrawController } from '../state';
import { findClosestEntity } from './find-closest-entity';

/**
 * The editable entity under the mouse, or null when the mouse is not close to any entity
 * The pick distance is in screen pixels, so it feels the same at every zoom level
 */
export function pickEntity(
	worldPoint: Point,
	entities: Entity[] = getEditableEntities()
): Entity | null {
	if (!entities.length) {
		return null;
	}
	const { distance, entity } = findClosestEntity(worldPoint, entities);
	const maxDistance = HIGHLIGHT_ENTITY_DISTANCE / getScreenCanvasDrawController().getScreenScale();
	return distance < maxDistance ? entity : null;
}
