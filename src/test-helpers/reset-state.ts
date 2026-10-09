import type { Layer } from '../App.types.ts';
import type { Entity } from '../entities/Entity.ts';
import {
	setActiveLayerId,
	setDimmedEntityIds,
	setEntities,
	setLayers,
	setSelectedEntityIds,
} from '../state.ts';

export function createTestLayer(id: string, overrides: Partial<Layer> = {}): Layer {
	return { id, name: id, isVisible: true, isLocked: false, ...overrides };
}

/**
 * Puts the global state in a known situation and creates an undo entry for it
 */
export function resetState(layers: Layer[], entities: Entity[] = []): void {
	setSelectedEntityIds([]);
	setDimmedEntityIds([]);
	setActiveLayerId(layers[0].id);
	setEntities(entities);
	setLayers(layers, true, true);
}
