import {StateEvent, ToolContext} from "./tool.types.ts";
import {Tool} from "../tools.ts";
import {selectToolStateMachine} from "./select-tool.ts";
import {assign, sendTo} from "xstate";
import {
	getSelectedEntities,
	getSelectedEntityIds,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers
} from "../state.ts";
import {BoundingBox, getBoundingBoxOfMultipleEntities} from "../helpers/get-bounding-box-of-multiple-entities.ts";
import {Entity} from "../entities/Entity.ts";

export interface AlignContext extends ToolContext {
}

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

export function GET_ALIGN_TOOL_STATE(type: Tool): any {
	return ({
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
						actions: sendTo('selectToolInsideTheAlignTool', ({event}: {event: any}) => {
							return event;
						}),
					},
					ESC: {
						actions: [AlignAction.DESELECT_ENTITIES, AlignAction.INIT_ALIGN_TOOL],
					},
					ENTER: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideTheAlignTool', ({event}: {event: any}) => {
							return event;
						}),
					},
					DRAW: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideTheAlignTool', ({event}: {event: any}) => {
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
	});
}

export function GET_ALIGN_ACTION(alignEntity: (entity: Entity, boundingBox: BoundingBox) => void) {
	return {
		actions: {
			[AlignAction.INIT_ALIGN_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				setAngleGuideOriginPoint(null);
				return {
				};
			}),
			[AlignAction.ALIGN_SELECTION]: () => {
				const selectedEntities = getSelectedEntities();
				if (!selectedEntities?.length) {
					throw new Error(
						'[ALIGN_LEFT] Calling align without entities selected',
					);
				}

				// Align the entities
				const boundingBox = getBoundingBoxOfMultipleEntities(selectedEntities);

				selectedEntities.forEach((entity) => alignEntity(entity, boundingBox));
			},
			[AlignAction.DESELECT_ENTITIES]: assign(() => {
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				return {
				};
			}),
			...selectToolStateMachine.implementations.actions,
		},
	};
}
