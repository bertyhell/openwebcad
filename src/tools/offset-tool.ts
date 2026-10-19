import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import type { Entity } from '../entities/Entity';
import { canOffsetEntity, type OffsetSide, offsetEntity } from '../helpers/offset-entity';
import { pickEntity } from '../helpers/pick-entity';
import {
	addEntities,
	getEditableSelectedEntities,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool';
import type {
	DrawEvent,
	MouseClickEvent,
	NumberInputEvent,
	StateEvent,
	TextInputEvent,
	ToolContext,
} from './tool.types';

export interface OffsetContext extends ToolContext {
	distance: number | null;
	/**
	 * Entities to offset: the selection when the tool started, or the clicked entity
	 */
	entities: Entity[];
}

export enum OffsetState {
	INIT = 'INIT',
	WAITING_FOR_DISTANCE = 'WAITING_FOR_DISTANCE',
	CHECK_SELECTION = 'CHECK_SELECTION',
	WAITING_FOR_ENTITY = 'WAITING_FOR_ENTITY',
	WAITING_FOR_SIDE = 'WAITING_FOR_SIDE',
}

export enum OffsetAction {
	INIT_OFFSET_TOOL = 'INIT_OFFSET_TOOL',
	RECORD_DISTANCE = 'RECORD_DISTANCE',
	HIGHLIGHT_ENTITY = 'HIGHLIGHT_ENTITY',
	RECORD_ENTITY = 'RECORD_ENTITY',
	RECORD_SELECTION = 'RECORD_SELECTION',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	ADD_OFFSET_ENTITY = 'ADD_OFFSET_ENTITY',
	CLEAR_ENTITY = 'CLEAR_ENTITY',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

const INSIDE_OPTION = 'I';
const OUTSIDE_OPTION = 'O';

const isValidDistance = ({ event }: { event: StateEvent }) => (event as NumberInputEvent).value > 0;

const isSideOption = ({ event }: { event: StateEvent }) =>
	[INSIDE_OPTION, OUTSIDE_OPTION].includes((event as TextInputEvent).value.toUpperCase());

function getSelectedOffsetEntities(): Entity[] {
	return getEditableSelectedEntities().filter(canOffsetEntity);
}

/**
 * The side from a click on the canvas or the typed [I]nside / [O]utside option
 */
function getEventSide(event: StateEvent): OffsetSide {
	if (event.type === 'TEXT_INPUT') {
		return (event as TextInputEvent).value.toUpperCase() === INSIDE_OPTION ? 'inside' : 'outside';
	}
	return (event as MouseClickEvent).worldMouseLocation;
}

/**
 * Offset tool state machine
 * 1. The user types the offset distance (ENTER reuses the last distance)
 * 2. The user clicks a line, circle, arc, rectangle or polyline, or uses the entities selected before starting the tool
 * 3. The user clicks on the side where the offset copy should be placed, or types [I]nside or [O]utside
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
			entities: [],
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
						target: OffsetState.CHECK_SELECTION,
					},
					ENTER: {
						// Reuse the last distance
						guard: ({ context }) => !!context.distance,
						target: OffsetState.CHECK_SELECTION,
					},
				},
			},
			[OffsetState.CHECK_SELECTION]: {
				description: 'Use the selected entities, if there are any',
				always: [
					{
						guard: () => getSelectedOffsetEntities().length > 0,
						actions: OffsetAction.RECORD_SELECTION,
						target: OffsetState.WAITING_FOR_SIDE,
					},
					{
						target: OffsetState.WAITING_FOR_ENTITY,
					},
				],
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
						// Done offsetting, go back to selecting
						actions: OffsetAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[OffsetState.WAITING_FOR_SIDE]: {
				description: 'Select the side to offset to',
				meta: {
					instructions: 'Click on the side for the offset, or [I]nside / [O]utside',
					instantOptions: [INSIDE_OPTION, OUTSIDE_OPTION],
				},
				always: {
					// The click didn't hit an entity that can be offset
					guard: ({ context }) => context.entities.length === 0,
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
					TEXT_INPUT: {
						guard: isSideOption,
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
					entities: [],
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
					return { entities: [] };
				}
				if (!canOffsetEntity(entity)) {
					toast.info(`Offset is not supported for this ${entity.getType().toLowerCase()}`);
					return { entities: [] };
				}
				setHighlightedEntityIds([entity.id]);
				return { entities: [entity] };
			}),
			[OffsetAction.RECORD_SELECTION]: assign(() => {
				const entities = getSelectedOffsetEntities();
				// Show the entities as highlighted, so the selection isn't reused for the next offset
				setSelectedEntityIds([]);
				setHighlightedEntityIds(entities.map((entity) => entity.id));
				return { entities };
			}),
			[OffsetAction.DRAW_PREVIEW]: ({ context, event }) => {
				const distance = context.distance;
				if (!distance) {
					return;
				}
				const sidePoint = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities(
					context.entities.flatMap((entity) => offsetEntity(entity, distance, sidePoint) ?? [])
				);
			},
			[OffsetAction.ADD_OFFSET_ENTITY]: ({ context, event }) => {
				const distance = context.distance;
				if (!distance || context.entities.length === 0) {
					return;
				}
				const side = getEventSide(event);
				const offsetResults = context.entities.flatMap(
					(entity) => offsetEntity(entity, distance, side) ?? []
				);
				const skippedCount = context.entities.length - offsetResults.length;
				if (skippedCount > 0) {
					toast.info(
						typeof side === 'string'
							? `Skipped ${skippedCount} of ${context.entities.length}: too small for this distance, or without an inside and outside, eg: lines`
							: 'The offset distance is too large for this side'
					);
				}
				if (offsetResults.length) {
					addEntities(offsetResults, true);
				}
			},
			[OffsetAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
			[OffsetAction.CLEAR_ENTITY]: assign(() => {
				setGhostHelperEntities([]);
				setHighlightedEntityIds([]);
				return { entities: [] };
			}),
		},
	}
);
