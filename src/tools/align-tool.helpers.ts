import {assign, sendTo} from 'xstate';
import type {Entity} from '../entities/Entity.ts';
import {type BoundingBox, getBoundingBoxOfMultipleEntities,} from '../helpers/get-bounding-box-of-multiple-entities.ts';
import {
	getSelectedEntities,
	getSelectedEntityIds,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state.ts';
import type {Tool} from '../tools.ts';
import {selectToolStateMachine} from './select-tool.ts';
import type {DrawEvent, KeyboardEnterEvent, MouseClickEvent, StateEvent, ToolContext} from './tool.types.ts';

export interface AlignContext extends ToolContext {}

export enum AlignState {
	INIT = 'INIT',
	CHECK_SELECTION = 'CHECK_SELECTION',
	WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
}

export enum AlignAction {
	INIT_ALIGN_TOOL = 'INIT_ALIGN_TOOL',
	ALIGN_SELECTION = 'ALIGN_SELECTION',
	DESELECT_ENTITIES = 'DESELECT_ENTITIES',
}

export function GET_ALIGN_TOOL_STATE(type: Tool) {
	return {
		types: {} as {
			context: AlignContext;
			events: StateEvent;
		},
		context: {
			type,
		},
		initial: AlignState.INIT,
		states: {
			[AlignState.INIT]: {
				description: 'Initializing the align tool',
				always: {
					actions: AlignAction.INIT_ALIGN_TOOL,
					target: AlignState.CHECK_SELECTION,
				},
			},
			[AlignState.WAITING_FOR_SELECTION]: {
				description: 'Select what you want to align',
				meta: {
					instructions: 'Select what you want to align, then ENTER',
				},
				invoke: {
					id: 'selectToolInsideTheAlignTool',
					src: selectToolStateMachine,
					onDone: {
						actions: assign(() => {
							return {};
						}),
						target: AlignState.CHECK_SELECTION,
					},
				},
				on: {
					MOUSE_CLICK: {
						// Forward the event to the select tool
						actions: sendTo(
							'selectToolInsideTheAlignTool',
							({ event }: { event: MouseClickEvent }) => {
								return event;
							}
						),
					},
					ESC: {
						actions: [AlignAction.DESELECT_ENTITIES, AlignAction.INIT_ALIGN_TOOL],
					},
					ENTER: {
						// Forward the event to the select tool
						actions: sendTo(
							'selectToolInsideTheAlignTool',
							({ event }: { event: KeyboardEnterEvent }) => {
								return event;
							}
						),
					},
					DRAW: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideTheAlignTool', ({ event }: { event: DrawEvent }) => {
							return event;
						}),
					},
				},
			},
			[AlignState.CHECK_SELECTION]: {
				description: 'Check if there is something selected',
				always: [
					{
						guard: () => {
							return getSelectedEntityIds().length > 0;
						},
						actions: AlignAction.ALIGN_SELECTION,
					},
					{
						guard: () => {
							return getSelectedEntityIds().length === 0;
						},
						target: AlignState.WAITING_FOR_SELECTION,
					},
				],
			},
		},
	};
}

export function GET_ALIGN_ACTION(alignEntity: (entity: Entity, boundingBox: BoundingBox) => void) {
	return {
		actions: {
			[AlignAction.INIT_ALIGN_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {};
			}),
			[AlignAction.ALIGN_SELECTION]: () => {
				const selectedEntities = getSelectedEntities();
				if (!selectedEntities?.length) {
					throw new Error('[ALIGN_LEFT] Calling align without entities selected');
				}

				// Align the entities
				const boundingBox = getBoundingBoxOfMultipleEntities(selectedEntities);

				for (const entity of selectedEntities) {
					alignEntity(entity, boundingBox);
				}
			},
			[AlignAction.DESELECT_ENTITIES]: assign(() => {
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				return {};
			}),
			...selectToolStateMachine.implementations.actions,
		},
	};
}
