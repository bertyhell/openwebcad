import { Box, Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import type { Entity } from '../entities/Entity.ts';
import { getSnappedMouseLocation } from '../helpers/get-closest-snap-point.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { isEntityInStretchWindow, stretchEntity } from '../helpers/stretch-entity.ts';
import {
	getEditableEntities,
	getEditableSelectedEntities,
	getEntities,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setDimmedEntityIds,
	setEntities,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { PointInputEvent, StateEvent, ToolContext } from './tool.types';
import { createGuideLine, replaceEntities } from './transform-tool.helpers.ts';

export interface StretchContext extends ToolContext {
	/**
	 * The editable entities that were selected before the tool started, the window only stretches these
	 * Empty when nothing was selected, the window then stretches every editable entity
	 */
	selectedEntities: Entity[];
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
	DIM_SELECTED_ENTITIES = 'DIM_SELECTED_ENTITIES',
	RESTART_WINDOW = 'RESTART_WINDOW',
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
 * Go back to picking the window, but keep the selection made before starting the tool
 */
const restartWindowTransition = {
	actions: StretchAction.RESTART_WINDOW,
	target: StretchState.WAITING_FOR_FIRST_CORNER,
};

/**
 * Stretch tool state machine
 * 1. The user draws a window around the part of the drawing that should move
 *    When entities were selected before starting the tool, only those are stretched
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
			selectedEntities: [],
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
					actions: [StretchAction.INIT_STRETCH_TOOL, StretchAction.DIM_SELECTED_ENTITIES],
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
					ESC: restartWindowTransition,
				},
			},
			[StretchState.WAITING_FOR_BASE_POINT]: {
				description: 'Select the base point',
				always: {
					// Nothing found inside the window, keep the selection made before starting and pick another window
					guard: ({ context }) => context.entities.length === 0,
					actions: StretchAction.RESTART_WINDOW,
					target: StretchState.WAITING_FOR_FIRST_CORNER,
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
					ESC: restartWindowTransition,
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
					ESC: restartWindowTransition,
				},
			},
		},
	},
	{
		actions: {
			[StretchAction.INIT_STRETCH_TOOL]: assign(() => {
				// Capture the selection before clearing it, so a selection made before starting the tool is used
				const selectedEntities = getEditableSelectedEntities();
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setHighlightedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					selectedEntities,
					firstCorner: null,
					box: null,
					entities: [],
					basePoint: null,
				};
			}),
			// Not part of the assign above: assign runs while the actor is created, before setActiveToolActor clears the dimmed entities
			[StretchAction.DIM_SELECTED_ENTITIES]: ({ context }) => {
				// Show the captured selection faded instead of selected, so ESC goes straight to the tool
				setDimmedEntityIds(context.selectedEntities.map((entity) => entity.id));
			},
			[StretchAction.RESTART_WINDOW]: assign(({ context }) => {
				setGhostHelperEntities([]);
				setHighlightedEntityIds([]);
				setAngleGuideOriginPoint(null);
				setDimmedEntityIds(context.selectedEntities.map((entity) => entity.id));
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
			[StretchAction.DRAW_TEMP_WINDOW]: ({ context }) => {
				if (!context.firstCorner) return;
				const mouseLocation = getSnappedMouseLocation();
				setGhostHelperEntities(getWindowGuideLines(context.firstCorner, mouseLocation));
			},
			[StretchAction.RECORD_WINDOW]: assign(({ context, event }) => {
				const secondCorner = getPointFromEvent(context.firstCorner, event as PointInputEvent);
				const box = getBox(context.firstCorner as Point, secondCorner);
				const candidates = context.selectedEntities.length
					? context.selectedEntities
					: getEditableEntities();
				const entities = candidates.filter((entity) => isEntityInStretchWindow(entity, box));
				setGhostHelperEntities([]);
				if (!entities.length) {
					toast.info('Nothing found inside the window');
				}
				// Highlighted instead of selected, a selection would make the first ESC only deselect them
				setHighlightedEntityIds(entities.map((entity) => entity.id));
				return {
					box,
					entities,
				};
			}),
			[StretchAction.RECORD_BASE_POINT]: assign(({ context, event }) => {
				const basePoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(basePoint);
				setHighlightedEntityIds([]);
				setDimmedEntityIds(context.entities.map((entity) => entity.id));
				return {
					basePoint,
				};
			}),
			[StretchAction.DRAW_TEMP_STRETCH]: ({ context }) => {
				if (!context.basePoint) return;
				const mouseLocation = getSnappedMouseLocation();
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
