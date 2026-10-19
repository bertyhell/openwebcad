import { Box, Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import type { Entity } from '../entities/Entity.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { stretchEntity } from '../helpers/stretch-entity.ts';
import {
	getEditableEntities,
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
import type { DrawEvent, PointInputEvent, StateEvent, ToolContext } from './tool.types';
import { createGuideLine, replaceEntities } from './transform-tool.helpers.ts';

export interface StretchContext extends ToolContext {
	firstCorner: Point | null;
	box: Box | null;
	entities: Entity[];
	basePoint: Point | null;
}

export enum StretchState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_CORNER = 'WAITING_FOR_FIRST_CORNER',
	WAITING_FOR_SECOND_CORNER = 'WAITING_FOR_SECOND_CORNER',
	WAITING_FOR_BASE_POINT = 'WAITING_FOR_BASE_POINT',
	WAITING_FOR_TARGET_POINT = 'WAITING_FOR_TARGET_POINT',
}

export enum StretchAction {
	INIT_STRETCH_TOOL = 'INIT_STRETCH_TOOL',
	RECORD_FIRST_CORNER = 'RECORD_FIRST_CORNER',
	DRAW_TEMP_WINDOW = 'DRAW_TEMP_WINDOW',
	RECORD_WINDOW = 'RECORD_WINDOW',
	RECORD_BASE_POINT = 'RECORD_BASE_POINT',
	DRAW_TEMP_STRETCH = 'DRAW_TEMP_STRETCH',
	APPLY_STRETCH = 'APPLY_STRETCH',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

function getBox(corner1: Point, corner2: Point): Box {
	return new Box(
		Math.min(corner1.x, corner2.x),
		Math.min(corner1.y, corner2.y),
		Math.max(corner1.x, corner2.x),
		Math.max(corner1.y, corner2.y)
	);
}

function getWindowGuideLines(corner1: Point, corner2: Point) {
	const corners = [
		corner1,
		new Point(corner2.x, corner1.y),
		corner2,
		new Point(corner1.x, corner2.y),
	];
	return corners.map((corner, index) => createGuideLine(corner, corners[(index + 1) % 4]));
}

function getStretchedEntities(context: StretchContext, targetPoint: Point): Entity[] {
	const basePoint = context.basePoint as Point;
	return context.entities.map((entity) =>
		stretchEntity(
			entity,
			context.box as Box,
			targetPoint.x - basePoint.x,
			targetPoint.y - basePoint.y
		)
	);
}

/**
 * Stretch tool state machine
 * 1. The user draws a window around the part of the drawing that should move
 * 2. The user picks a base point and a target point
 * 3. End points inside the window move, end points outside the window stay where they are
 */
export const stretchToolStateMachine = createMachine(
	{
		types: {} as {
			context: StretchContext;
			events: StateEvent;
		},
		context: {
			firstCorner: null,
			box: null,
			entities: [],
			basePoint: null,
			type: Tool.STRETCH,
		},
		initial: StretchState.INIT,
		states: {
			[StretchState.INIT]: {
				description: 'Initializing the stretch tool',
				always: {
					actions: StretchAction.INIT_STRETCH_TOOL,
					target: StretchState.WAITING_FOR_FIRST_CORNER,
				},
			},
			[StretchState.WAITING_FOR_FIRST_CORNER]: {
				description: 'Select the first corner of the window',
				meta: {
					instructions: 'Select the first corner of a window around the points to stretch',
				},
				on: {
					MOUSE_CLICK: {
						actions: StretchAction.RECORD_FIRST_CORNER,
						target: StretchState.WAITING_FOR_SECOND_CORNER,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StretchAction.RECORD_FIRST_CORNER,
						target: StretchState.WAITING_FOR_SECOND_CORNER,
					},
					ESC: {
						actions: StretchAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[StretchState.WAITING_FOR_SECOND_CORNER]: {
				description: 'Select the second corner of the window',
				meta: {
					instructions: 'Select the second corner of the window',
				},
				on: {
					DRAW: {
						actions: StretchAction.DRAW_TEMP_WINDOW,
					},
					MOUSE_CLICK: {
						actions: StretchAction.RECORD_WINDOW,
						target: StretchState.WAITING_FOR_BASE_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StretchAction.RECORD_WINDOW,
						target: StretchState.WAITING_FOR_BASE_POINT,
					},
					RELATIVE_POINT_INPUT: {
						actions: StretchAction.RECORD_WINDOW,
						target: StretchState.WAITING_FOR_BASE_POINT,
					},
					ESC: {
						target: StretchState.INIT,
					},
				},
			},
			[StretchState.WAITING_FOR_BASE_POINT]: {
				description: 'Select the base point',
				always: {
					guard: ({ context }) => context.entities.length === 0,
					target: StretchState.INIT,
				},
				meta: {
					instructions: 'Select the base point',
				},
				on: {
					MOUSE_CLICK: {
						actions: StretchAction.RECORD_BASE_POINT,
						target: StretchState.WAITING_FOR_TARGET_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StretchAction.RECORD_BASE_POINT,
						target: StretchState.WAITING_FOR_TARGET_POINT,
					},
					ESC: {
						target: StretchState.INIT,
					},
				},
			},
			[StretchState.WAITING_FOR_TARGET_POINT]: {
				description: 'Select the target point',
				meta: {
					instructions: 'Select the target point or type a distance',
				},
				on: {
					DRAW: {
						actions: StretchAction.DRAW_TEMP_STRETCH,
					},
					MOUSE_CLICK: {
						actions: StretchAction.APPLY_STRETCH,
						target: StretchState.INIT,
					},
					NUMBER_INPUT: {
						actions: StretchAction.APPLY_STRETCH,
						target: StretchState.INIT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StretchAction.APPLY_STRETCH,
						target: StretchState.INIT,
					},
					RELATIVE_POINT_INPUT: {
						actions: StretchAction.APPLY_STRETCH,
						target: StretchState.INIT,
					},
					ESC: {
						target: StretchState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[StretchAction.INIT_STRETCH_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setDimmedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					firstCorner: null,
					box: null,
					entities: [],
					basePoint: null,
				};
			}),
			[StretchAction.RECORD_FIRST_CORNER]: assign(({ event }) => {
				return {
					firstCorner: getPointFromEvent(null, event as PointInputEvent),
				};
			}),
			[StretchAction.DRAW_TEMP_WINDOW]: ({ context, event }) => {
				if (!context.firstCorner) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities(getWindowGuideLines(context.firstCorner, mouseLocation));
			},
			[StretchAction.RECORD_WINDOW]: assign(({ context, event }) => {
				const secondCorner = getPointFromEvent(context.firstCorner, event as PointInputEvent);
				const box = getBox(context.firstCorner as Point, secondCorner);
				const entities = getEditableEntities().filter(
					(entity) => entity.intersectsWithBox(box) || entity.isContainedInBox(box)
				);
				setGhostHelperEntities([]);
				if (!entities.length) {
					toast.info('Nothing found inside the window');
				}
				setSelectedEntityIds(entities.map((entity) => entity.id));
				return {
					box,
					entities,
				};
			}),
			[StretchAction.RECORD_BASE_POINT]: assign(({ context, event }) => {
				const basePoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(basePoint);
				setSelectedEntityIds([]);
				setDimmedEntityIds(context.entities.map((entity) => entity.id));
				return {
					basePoint,
				};
			}),
			[StretchAction.DRAW_TEMP_STRETCH]: ({ context, event }) => {
				if (!context.basePoint) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities([
					createGuideLine(context.basePoint, mouseLocation),
					...getStretchedEntities(context, mouseLocation),
				]);
			},
			[StretchAction.APPLY_STRETCH]: ({ context, event }) => {
				if (!context.basePoint) return;
				const targetPoint = getPointFromEvent(context.basePoint, event as PointInputEvent);
				setEntities(
					replaceEntities(
						getEntities(),
						context.entities,
						getStretchedEntities(context, targetPoint)
					),
					true
				);
			},
			[StretchAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
