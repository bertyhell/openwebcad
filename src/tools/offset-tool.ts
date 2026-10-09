import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import type { Entity } from '../entities/Entity';
import { canOffsetEntity, offsetEntity } from '../helpers/offset-entity';
import { pickEntity } from '../helpers/pick-entity';
import {
	addEntities,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type {
	DrawEvent,
	MouseClickEvent,
	NumberInputEvent,
	StateEvent,
	ToolContext,
} from './tool.types';

export interface OffsetContext extends ToolContext {
	distance: number | null;
	entity: Entity | null;
}

export enum OffsetState {
	INIT = 'INIT',
	WAITING_FOR_DISTANCE = 'WAITING_FOR_DISTANCE',
	WAITING_FOR_ENTITY = 'WAITING_FOR_ENTITY',
	WAITING_FOR_SIDE = 'WAITING_FOR_SIDE',
}

export enum OffsetAction {
	INIT_OFFSET_TOOL = 'INIT_OFFSET_TOOL',
	RECORD_DISTANCE = 'RECORD_DISTANCE',
	HIGHLIGHT_ENTITY = 'HIGHLIGHT_ENTITY',
	RECORD_ENTITY = 'RECORD_ENTITY',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	ADD_OFFSET_ENTITY = 'ADD_OFFSET_ENTITY',
	CLEAR_ENTITY = 'CLEAR_ENTITY',
}

const isValidDistance = ({ event }: { event: StateEvent }) => (event as NumberInputEvent).value > 0;

/**
 * Offset tool state machine
 * 1. The user types the offset distance (ENTER reuses the last distance)
 * 2. The user clicks a line, circle, arc, rectangle or polyline
 * 3. The user clicks on the side where the offset copy should be placed
 * Then the user can pick the next entity to offset with the same distance
 */
export const offsetToolStateMachine = createMachine(
	{
		types: {} as {
			context: OffsetContext;
			events: StateEvent;
		},
		context: {
			distance: null,
			entity: null,
			type: Tool.OFFSET,
		},
		initial: OffsetState.INIT,
		states: {
			[OffsetState.INIT]: {
				description: 'Initializing the offset tool',
				always: {
					actions: OffsetAction.INIT_OFFSET_TOOL,
					target: OffsetState.WAITING_FOR_DISTANCE,
				},
			},
			[OffsetState.WAITING_FOR_DISTANCE]: {
				description: 'Type the offset distance',
				meta: {
					instructions: 'Type the offset distance, then ENTER',
				},
				on: {
					NUMBER_INPUT: {
						guard: isValidDistance,
						actions: OffsetAction.RECORD_DISTANCE,
						target: OffsetState.WAITING_FOR_ENTITY,
					},
					ENTER: {
						// Reuse the last distance
						guard: ({ context }) => !!context.distance,
						target: OffsetState.WAITING_FOR_ENTITY,
					},
				},
			},
			[OffsetState.WAITING_FOR_ENTITY]: {
				description: 'Select the entity to offset',
				meta: {
					instructions: 'Select the entity to offset, or type a new distance',
				},
				on: {
					DRAW: {
						actions: OffsetAction.HIGHLIGHT_ENTITY,
					},
					MOUSE_CLICK: {
						actions: OffsetAction.RECORD_ENTITY,
						target: OffsetState.WAITING_FOR_SIDE,
					},
					NUMBER_INPUT: {
						guard: isValidDistance,
						actions: OffsetAction.RECORD_DISTANCE,
					},
					ESC: {
						target: OffsetState.INIT,
					},
				},
			},
			[OffsetState.WAITING_FOR_SIDE]: {
				description: 'Select the side to offset to',
				meta: {
					instructions: 'Click on the side where the offset should be placed',
				},
				always: {
					// The click didn't hit an entity that can be offset
					guard: ({ context }) => !context.entity,
					target: OffsetState.WAITING_FOR_ENTITY,
				},
				on: {
					DRAW: {
						actions: OffsetAction.DRAW_PREVIEW,
					},
					MOUSE_CLICK: {
						actions: [OffsetAction.ADD_OFFSET_ENTITY, OffsetAction.CLEAR_ENTITY],
						target: OffsetState.WAITING_FOR_ENTITY,
					},
					ESC: {
						actions: OffsetAction.CLEAR_ENTITY,
						target: OffsetState.WAITING_FOR_ENTITY,
					},
				},
			},
		},
	},
	{
		actions: {
			[OffsetAction.INIT_OFFSET_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setHighlightedEntityIds([]);
				setAngleGuideOriginPoint(null);
				return {
					entity: null,
				};
			}),
			[OffsetAction.RECORD_DISTANCE]: assign(({ event }) => {
				return {
					distance: (event as NumberInputEvent).value,
				};
			}),
			[OffsetAction.HIGHLIGHT_ENTITY]: ({ event }) => {
				const entity = pickEntity((event as DrawEvent).drawController.getWorldMouseLocation());
				setHighlightedEntityIds(entity ? [entity.id] : []);
			},
			[OffsetAction.RECORD_ENTITY]: assign(({ event }) => {
				const entity = pickEntity((event as MouseClickEvent).worldMouseLocation);
				if (!entity) {
					return { entity: null };
				}
				if (!canOffsetEntity(entity)) {
					toast.info(`Offset is not supported for this ${entity.getType().toLowerCase()}`);
					return { entity: null };
				}
				setHighlightedEntityIds([entity.id]);
				return { entity };
			}),
			[OffsetAction.DRAW_PREVIEW]: ({ context, event }) => {
				if (!context.entity || !context.distance) {
					return;
				}
				const preview = offsetEntity(
					context.entity,
					context.distance,
					(event as DrawEvent).drawController.getWorldMouseLocation()
				);
				setGhostHelperEntities(preview ? [preview] : []);
			},
			[OffsetAction.ADD_OFFSET_ENTITY]: ({ context, event }) => {
				if (!context.entity || !context.distance) {
					return;
				}
				const offsetResult = offsetEntity(
					context.entity,
					context.distance,
					(event as MouseClickEvent).worldMouseLocation
				);
				if (!offsetResult) {
					toast.info('The offset distance is too large for this side');
					return;
				}
				addEntities([offsetResult], true);
			},
			[OffsetAction.CLEAR_ENTITY]: assign(() => {
				setGhostHelperEntities([]);
				setHighlightedEntityIds([]);
				return { entity: null };
			}),
		},
	}
);
