import {toast} from 'react-toastify';
import {assign, createMachine, sendTo} from 'xstate';
import {PolyLineEntity} from '../entities/PolyLineEntity.ts';
import {
	getActiveLayerId,
	getNotSelectedEntities,
	getSelectedEntities,
	getSelectedEntityIds,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import {Tool} from '../tools';
import {selectToolStateMachine} from './select-tool';
import type {StateEvent, ToolContext} from './tool.types';

export interface PeditContext extends ToolContext {}

export enum PeditState {
	INIT = 'INIT',
	CHECK_SELECTION = 'CHECK_SELECTION',
	WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
	CONVERT_SELECTION_TO_POLYLINE = 'CONVERT_SELECTION_TO_POLYLINE',
}

export enum PeditAction {
	INIT_PEDIT_TOOL = 'INIT_PEDIT_TOOL',
	DESELECT_ENTITIES = 'DESELECT_ENTITIES',
	CONVERT_SELECTION_TO_POLYLINE = 'CONVERT_SELECTION_TO_POLYLINE',
}

/**
 * Pedit tool state machine
 * This state machine is responsible for combining entities into a polyline
 * It uses the select tool state machine to select entities to combine
 * When the user presses enter, the selected entities are combined into one polyline
 */
export const peditToolStateMachine = createMachine(
	{
		types: {} as {
			context: PeditContext;
			events: StateEvent;
		},
		context: {
			type: Tool.PEDIT,
		},
		initial: PeditState.INIT,
		states: {
			[PeditState.INIT]: {
				description: 'Initializing the pedit tool',
				always: {
					actions: PeditAction.INIT_PEDIT_TOOL,
					target: PeditState.CHECK_SELECTION,
				},
			},
			[PeditState.CHECK_SELECTION]: {
				description: 'Check if there is something selected',
				always: [
					{
						guard: () => {
							return getSelectedEntityIds().length > 0;
						},
						target: PeditState.CONVERT_SELECTION_TO_POLYLINE,
					},
					{
						guard: () => {
							return getSelectedEntityIds().length === 0;
						},
						target: PeditState.WAITING_FOR_SELECTION,
					},
				],
			},
			[PeditState.WAITING_FOR_SELECTION]: {
				description: 'Select the entities that you want to combine into a polyline',
				meta: {
					instructions: 'Select what you want to combine into a polyline, then ENTER',
				},
				invoke: {
					id: 'selectToolInsideThePeditTool',
					src: selectToolStateMachine,
					onDone: {
						target: PeditState.CHECK_SELECTION,
					},
				},
				on: {
					MOUSE_CLICK: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideThePeditTool', ({ event }) => {
							return event;
						}),
					},
					ESC: {
						actions: [PeditAction.DESELECT_ENTITIES, PeditAction.INIT_PEDIT_TOOL],
					},
					ENTER: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideThePeditTool', ({ event }) => {
							return event;
						}),
					},
					DRAW: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideThePeditTool', ({ event }) => {
							return event;
						}),
					},
				},
			},
			[PeditState.CONVERT_SELECTION_TO_POLYLINE]: {
				always: {
					actions: PeditAction.CONVERT_SELECTION_TO_POLYLINE,
					target: PeditState.INIT,
				},
			},
		},
	},
	{
		actions: {
			[PeditAction.INIT_PEDIT_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {};
			}),
			[PeditAction.CONVERT_SELECTION_TO_POLYLINE]: assign(() => {
				const newPolyLine = new PolyLineEntity(getActiveLayerId(), getSelectedEntities());
				const newEntities = [...getNotSelectedEntities(), newPolyLine];
				setEntities(newEntities, true);
				setSelectedEntityIds([]);
				toast.success(`Created polyline with ${newPolyLine.numberOfSegments()} segments`);
				return {};
			}),
			...selectToolStateMachine.implementations.actions,
		},
	}
);
