import type { Entity } from '../entities/Entity';

/**
 * Copies the style and layer of an entity onto its clone, so moving, copying, rotating, ... keeps the look of the entity
 */
export function copyEntityBaseProperties<T extends Entity>(source: Entity, target: T): T {
	target.lineColor = source.lineColor;
	target.lineWidth = source.lineWidth;
	target.lineDash = source.lineDash ? [...source.lineDash] : undefined;
	target.layerId = source.layerId;
	return target;
}
