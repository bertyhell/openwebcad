import { groupEntities } from '../helpers/group-entities.ts';
import { Tool } from '../tools';
import { createSelectionActionToolStateMachine } from './selection-action-tool.helpers.ts';

/**
 * Combines the selected entities into one group, explode the group to ungroup it
 */
export const groupToolStateMachine = createSelectionActionToolStateMachine({
	tool: Tool.GROUP,
	verb: 'group',
	apply: (selectedEntities, entities) => {
		const result = groupEntities(selectedEntities, entities);
		return {
			entities: result.entities,
			selectedEntityIds: result.group ? [result.group.id] : [],
		};
	},
});
