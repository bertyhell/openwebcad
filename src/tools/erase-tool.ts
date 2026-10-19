import { Tool } from '../tools';
import { createSelectionActionToolStateMachine } from './selection-action-tool.helpers.ts';

/**
 * Deletes the selected entities
 */
export const eraseToolStateMachine = createSelectionActionToolStateMachine({
	tool: Tool.ERASE,
	verb: 'delete',
	apply: (selectedEntities, entities) => {
		const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
		return { entities: entities.filter((entity) => !selectedIds.has(entity.id)) };
	},
});
