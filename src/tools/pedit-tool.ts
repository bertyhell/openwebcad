import { toast } from 'react-toastify';
import { assign, createMachine, sendTo } from 'xstate';
import type { StartAndEndpointEntity } from '../App.types';
import { type Entity, EntityName } from '../entities/Entity';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { joinConnectedSegments } from '../helpers/order-edge-boundary';
import {
	getEntities,
	getSelectedEntities,
	getSelectedEntityIds,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool';
import type { StateEvent, ToolContext } from './tool.types';

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
				// Lines and arcs can be selected in any order and direction, connect them into one chain
				const segments = getSelectedEntities().filter((entity) =>
					[EntityName.Line, EntityName.Arc].includes(entity.getType())
				) as (Entity & StartAndEndpointEntity)[];
				setSelectedEntityIds([]);
				if (segments.length === 0) {
					toast.info('Select lines or arcs to combine into a polyline');
					return {};
				}
				// Use clones, so the undo history keeps the original lines and arcs
				const clones = segments.map(
					(segment) => segment.clone() as Entity & StartAndEndpointEntity
				);
				// Only segments that connect end to end are joined, a polyline with gaps would be drawn and exported as one path
				const { chain, unconnected } = joinConnectedSegments(clones);
				const unconnectedClones = new Set(unconnected);
				const joinedSegments = segments.filter(
					(_segment, index) => !unconnectedClones.has(clones[index])
				);
				// Only the joined lines and arcs are replaced by the polyline, other selected entities are kept
				const joinedIds = new Set(joinedSegments.map((segment) => segment.id));
				const newPolyLine = copyEntityBaseProperties(joinedSegments[0], new PolyLineEntity(chain));
				const newEntities = [
					...getEntities().filter((entity) => !joinedIds.has(entity.id)),
					newPolyLine,
				];
				setEntities(newEntities, true);
				toast.success(`Created polyline with ${newPolyLine.numberOfSegments()} segments`);
				if (unconnected.length === 1) {
					toast.info("1 selected segment doesn't connect to the polyline and was left out");
				} else if (unconnected.length > 1) {
					toast.info(
						`${unconnected.length} selected segments don't connect to the polyline and were left out`
					);
				}
				return {};
			}),
			...selectToolStateMachine.implementations.actions,
		},
	}
);
