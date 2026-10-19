import { Actor, createMachine, sendTo } from 'xstate';
import type { Entity } from '../entities/Entity';
import {
	getEditableSelectedEntities,
	getEntities,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import type { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool';
import type { StateEvent, ToolContext } from './tool.types';

export interface SelectionActionResult {
	/**
	 * All entities of the drawing after the action
	 */
	entities: Entity[];
	/**
	 * Entities to select after the action, eg: the new group
	 */
	selectedEntityIds?: string[];
}

export interface SelectionActionToolConfig {
	tool: Tool;
	/**
	 * Verb used in the instructions, eg: delete
	 */
	verb: string;
	/**
	 * Apply the action to the selected entities
	 */
	apply: (selectedEntities: Entity[], entities: Entity[]) => SelectionActionResult;
}

export enum SelectionActionState {
	INIT = 'INIT',
	CHECK_SELECTION = 'CHECK_SELECTION',
	WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
}

export enum SelectionActionAction {
	INIT_TOOL = 'INIT_TOOL',
	APPLY_ACTION = 'APPLY_ACTION',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Creates a tool that does something with the selection in one go, eg: erase, group, explode
 * 1. The user selects entities (or has them selected before activating the tool), then ENTER
 * 2. The action is applied and the select tool is activated again
 */
export function createSelectionActionToolStateMachine(config: SelectionActionToolConfig) {
	const selectToolId = `selectToolInside${config.tool}Tool`;

	return createMachine(
		{
			types: {} as {
				context: ToolContext;
				events: StateEvent;
			},
			context: {
				type: config.tool,
			},
			initial: SelectionActionState.INIT,
			states: {
				[SelectionActionState.INIT]: {
					description: `Initializing the ${config.verb} tool`,
					always: {
						actions: SelectionActionAction.INIT_TOOL,
						target: SelectionActionState.CHECK_SELECTION,
					},
				},
				[SelectionActionState.CHECK_SELECTION]: {
					description: 'Check if there is something selected',
					always: [
						{
							guard: () => getEditableSelectedEntities().length > 0,
							actions: [
								SelectionActionAction.APPLY_ACTION,
								SelectionActionAction.SWITCH_TO_SELECT_TOOL,
							],
						},
						{
							target: SelectionActionState.WAITING_FOR_SELECTION,
						},
					],
				},
				[SelectionActionState.WAITING_FOR_SELECTION]: {
					description: `Select what you want to ${config.verb}`,
					meta: {
						instructions: `Select what you want to ${config.verb}, then ENTER`,
					},
					invoke: {
						id: selectToolId,
						src: selectToolStateMachine,
						onDone: {
							target: SelectionActionState.CHECK_SELECTION,
						},
					},
					on: {
						// Forward the events to the select tool
						MOUSE_CLICK: { actions: sendTo(selectToolId, ({ event }) => event) },
						ENTER: { actions: sendTo(selectToolId, ({ event }) => event) },
						DRAW: { actions: sendTo(selectToolId, ({ event }) => event) },
						ESC: {
							actions: SelectionActionAction.SWITCH_TO_SELECT_TOOL,
						},
					},
				},
			},
		},
		{
			actions: {
				[SelectionActionAction.INIT_TOOL]: () => {
					setShouldDrawHelpers(false);
					setGhostHelperEntities([]);
					setAngleGuideOriginPoint(null);
				},
				[SelectionActionAction.APPLY_ACTION]: () => {
					const result = config.apply(getEditableSelectedEntities(), getEntities());
					setEntities(result.entities, true);
					setSelectedEntityIds(result.selectedEntityIds ?? []);
				},
				[SelectionActionAction.SWITCH_TO_SELECT_TOOL]: () => {
					setActiveToolActor(new Actor(selectToolStateMachine));
				},
			},
		}
	);
}
