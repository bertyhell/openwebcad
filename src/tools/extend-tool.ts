import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { EntityName } from '../entities/Entity';
import { extendEntity } from '../helpers/extend-entity';
import { pickEntity } from '../helpers/pick-entity';
import {
	getEditableEntities,
	getEntities,
	getVisibleEntities,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { DrawEvent, MouseClickEvent, StateEvent, ToolContext } from './tool.types';
import { replaceEntities } from './transform-tool.helpers';

export enum ExtendState {
	INIT = 'INIT',
	WAITING_FOR_ENTITY = 'WAITING_FOR_ENTITY',
}

export enum ExtendAction {
	INIT_EXTEND_TOOL = 'INIT_EXTEND_TOOL',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	EXTEND_ENTITY = 'EXTEND_ENTITY',
}

function pickExtendableEntity(worldPoint: Parameters<typeof pickEntity>[0]) {
	const extendableEntities = getEditableEntities().filter((entity) =>
		[EntityName.Line, EntityName.Arc].includes(entity.getType())
	);
	return pickEntity(worldPoint, extendableEntities);
}

/**
 * Extend tool state machine
 * The user clicks a line or arc near the end that should be extended
 * The end is extended until it hits the nearest other entity
 */
export const extendToolStateMachine = createMachine(
	{
		types: {} as {
			context: ToolContext;
			events: StateEvent;
		},
		context: {
			type: Tool.EXTEND,
		},
		initial: ExtendState.INIT,
		states: {
			[ExtendState.INIT]: {
				description: 'Initializing the extend tool',
				always: {
					actions: ExtendAction.INIT_EXTEND_TOOL,
					target: ExtendState.WAITING_FOR_ENTITY,
				},
			},
			[ExtendState.WAITING_FOR_ENTITY]: {
				description: 'Select the end of a line or arc to extend',
				meta: {
					instructions: 'Click a line or arc near the end you want to extend',
				},
				on: {
					DRAW: { actions: ExtendAction.DRAW_PREVIEW },
					MOUSE_CLICK: { actions: ExtendAction.EXTEND_ENTITY },
				},
			},
		},
	},
	{
		actions: {
			[ExtendAction.INIT_EXTEND_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setHighlightedEntityIds([]);
				setAngleGuideOriginPoint(null);
				return {};
			}),
			[ExtendAction.DRAW_PREVIEW]: ({ event }) => {
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				const entity = pickExtendableEntity(mouseLocation);
				setHighlightedEntityIds(entity ? [entity.id] : []);
				const extended = entity ? extendEntity(entity, mouseLocation, getVisibleEntities()) : null;
				if (extended) {
					extended.lineDash = [4, 4];
				}
				setGhostHelperEntities(extended ? [extended] : []);
			},
			[ExtendAction.EXTEND_ENTITY]: ({ event }) => {
				const clickPoint = (event as MouseClickEvent).worldMouseLocation;
				const entity = pickExtendableEntity(clickPoint);
				if (!entity) {
					return;
				}
				const extended = extendEntity(entity, clickPoint, getVisibleEntities());
				if (!extended) {
					toast.info('There is nothing to extend to');
					return;
				}
				setEntities(replaceEntities(getEntities(), [entity], [extended]), true);
				setGhostHelperEntities([]);
			},
		},
	}
);
