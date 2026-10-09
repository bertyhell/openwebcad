import type { Entity } from '../entities/Entity';
import { getActiveLineColor, getActiveLineWidth } from '../state';

/**
 * New entities get the line color and line width that the user picked in the sidebar
 */
export function applyActiveStyle<T extends Entity>(entity: T): T {
	entity.lineColor = getActiveLineColor();
	entity.lineWidth = getActiveLineWidth();
	return entity;
}
