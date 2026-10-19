import { explodeEntities } from '../helpers/explode-entity.ts';
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
		return {
			entities: result.entities,
			selectedEntityIds: result.explodedEntities.map((entity) => entity.id),
		};
	},
});
