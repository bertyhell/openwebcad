import { toast } from 'react-toastify';
import { groupEntities } from '../helpers/group-entities.ts';
import { getSelectedEntityIds } from '../state';
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
		if (!result.group) {
			// Keep the selection, so the user can add to it instead of starting over
			toast.info('Select at least 2 entities on unlocked layers to group');
			return {
				entities,
				selectedEntityIds: getSelectedEntityIds(),
			};
		}
		return {
			entities: result.entities,
			selectedEntityIds: [result.group.id],
		};
	},
});
