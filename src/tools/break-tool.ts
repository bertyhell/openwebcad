import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import type { Entity } from '../entities/Entity.ts';
import { breakEntity, isBreakable } from '../helpers/break-entity.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { pickEntity } from '../helpers/pick-entity.ts';
import {
	getEntities,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setDimmedEntityIds,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type {
	DrawEvent,
	MouseClickEvent,
	PointInputEvent,
	StateEvent,
	ToolContext,
} from './tool.types';

export interface BreakContext extends ToolContext {
	entity: Entity | null;
	firstPoint: Point | null;
}

export enum BreakState {
	INIT = 'INIT',
	WAITING_FOR_ENTITY = 'WAITING_FOR_ENTITY',
	WAITING_FOR_SECOND_POINT = 'WAITING_FOR_SECOND_POINT',
}

export enum BreakAction {
	INIT_BREAK_TOOL = 'INIT_BREAK_TOOL',
	PICK_ENTITY = 'PICK_ENTITY',
	DRAW_TEMP_BREAK = 'DRAW_TEMP_BREAK',
	BREAK_ENTITY = 'BREAK_ENTITY',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Break tool state machine
 * The user clicks an entity, the click is the first break point, then picks the second break point
 * The part of the entity between the two points is removed
 */
export const breakToolStateMachine = createMachine(
	{
		types: {} as {
			context: BreakContext;
			events: StateEvent;
		},
		context: {
			entity: null,
			firstPoint: null,
			type: Tool.BREAK,
		},
		initial: BreakState.INIT,
		states: {
			[BreakState.INIT]: {
				description: 'Initializing the break tool',
				always: {
					actions: BreakAction.INIT_BREAK_TOOL,
					target: BreakState.WAITING_FOR_ENTITY,
				},
			},
			[BreakState.WAITING_FOR_ENTITY]: {
				description: 'Select the entity at the first break point',
				meta: {
					instructions: 'Click a line, arc, circle, rectangle or polyline at the first break point',
				},
				on: {
					MOUSE_CLICK: [
						{
							guard: ({ event }) => {
								const entity = pickEntity((event as MouseClickEvent).worldMouseLocation);
								if (entity && !isBreakable(entity)) {
									toast.info(`A ${entity.getType().toLowerCase()} can't be broken`);
									return false;
								}
								return !!entity;
							},
							actions: BreakAction.PICK_ENTITY,
							target: BreakState.WAITING_FOR_SECOND_POINT,
						},
					],
					ESC: {
						actions: BreakAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[BreakState.WAITING_FOR_SECOND_POINT]: {
				description: 'Select the second break point',
				meta: {
					instructions: 'Select the second break point',
				},
				on: {
					DRAW: {
						actions: BreakAction.DRAW_TEMP_BREAK,
					},
					MOUSE_CLICK: {
						actions: BreakAction.BREAK_ENTITY,
						target: BreakState.INIT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: BreakAction.BREAK_ENTITY,
						target: BreakState.INIT,
					},
					RELATIVE_POINT_INPUT: {
						actions: BreakAction.BREAK_ENTITY,
						target: BreakState.INIT,
					},
					ESC: {
						target: BreakState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[BreakAction.INIT_BREAK_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setDimmedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					entity: null,
					firstPoint: null,
				};
			}),
			[BreakAction.PICK_ENTITY]: assign(({ event }) => {
				const firstPoint = (event as MouseClickEvent).worldMouseLocation;
				const entity = pickEntity(firstPoint);
				setDimmedEntityIds(entity ? [entity.id] : []);
				return {
					entity,
					firstPoint,
				};
			}),
			[BreakAction.DRAW_TEMP_BREAK]: ({ context, event }) => {
				if (!context.entity || !context.firstPoint) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities(
					breakEntity(context.entity, context.firstPoint, mouseLocation) ?? []
				);
			},
			[BreakAction.BREAK_ENTITY]: ({ context, event }) => {
				if (!context.entity || !context.firstPoint) return;
				const secondPoint = getPointFromEvent(context.firstPoint, event as PointInputEvent);
				const pieces = breakEntity(context.entity, context.firstPoint, secondPoint);
				if (!pieces) return;
				const brokenEntityId = context.entity.id;
				setEntities(
					getEntities().flatMap((entity) => (entity.id === brokenEntityId ? pieces : [entity])),
					true
				);
			},
			[BreakAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
