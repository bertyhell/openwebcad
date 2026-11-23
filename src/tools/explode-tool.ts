import { toast } from 'react-toastify';
import { explodeEntities } from '../helpers/explode-entity.ts';
import { getSelectedEntityIds } from '../state';
import { Tool } from '../tools';
import { createSelectionActionToolStateMachine } from './selection-action-tool.helpers.ts';

/**
 * Splits the selected polylines, rectangles, groups and measurements into simpler entities
 */
export const explodeToolStateMachine = createSelectionActionToolStateMachine({
	tool: Tool.EXPLODE,
	verb: 'explode',
	apply: (selectedEntities, entities) => {
		const result = explodeEntities(selectedEntities, entities);
		if (!result.explodedEntities.length) {
			// Keep the selection, so the user can see what was selected and change it
			toast.info('Nothing to explode, select polylines, rectangles, groups or measurements');
			return {
				entities,
				selectedEntityIds: getSelectedEntityIds(),
			};
		}
		return {
			entities: result.entities,
			selectedEntityIds: result.explodedEntities.map((entity) => entity.id),
		};
	},
});
