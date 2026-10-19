import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import { createBoundaryPicker } from '../helpers/boundary-picker.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { formatAreaInfo, getBoundaryAreaInfo, getPolygonAreaInfo } from '../helpers/inquiry.ts';
import {
	setActiveToolActor,
	setAngleGuideOriginPoint,
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
	TextInputEvent,
	ToolContext,
} from './tool.types';
import { createGuideLine } from './transform-tool.helpers.ts';

const areaBoundaryPicker = createBoundaryPicker();

export interface AreaContext extends ToolContext {
	points: Point[];
}

export enum AreaState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_POINT = 'WAITING_FOR_FIRST_POINT',
	WAITING_FOR_NEXT_POINT = 'WAITING_FOR_NEXT_POINT',
	WAITING_FOR_CLICK_INSIDE_AREA = 'WAITING_FOR_CLICK_INSIDE_AREA',
}

export enum AreaAction {
	INIT_AREA_TOOL = 'INIT_AREA_TOOL',
	RECORD_POINT = 'RECORD_POINT',
	DRAW_TEMP_POLYGON = 'DRAW_TEMP_POLYGON',
	SHOW_POLYGON_AREA = 'SHOW_POLYGON_AREA',
	DRAW_TEMP_BOUNDARY = 'DRAW_TEMP_BOUNDARY',
	SHOW_BOUNDARY_AREA = 'SHOW_BOUNDARY_AREA',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

const OBJECT_OPTION = 'O';

function getGuideLines(points: Point[]) {
	return points.map((point, index) => createGuideLine(point, points[(index + 1) % points.length]));
}

/**
 * Area tool state machine
 * Shows the area and perimeter of
 * - a polygon through points that the user picks
 * - or a closed area that the user clicks inside of, excluding the holes in that area
 */
export const areaToolStateMachine = createMachine(
	{
		types: {} as {
			context: AreaContext;
			events: StateEvent;
		},
		context: {
			points: [],
			type: Tool.AREA,
		},
		initial: AreaState.INIT,
		states: {
			[AreaState.INIT]: {
				description: 'Initializing the area tool',
				always: {
					actions: AreaAction.INIT_AREA_TOOL,
					target: AreaState.WAITING_FOR_FIRST_POINT,
				},
			},
			[AreaState.WAITING_FOR_FIRST_POINT]: {
				description: 'Select the first corner point',
				meta: {
					instructions: 'Select the first corner point, or [O]bject to click inside a closed area',
					instantOptions: [OBJECT_OPTION],
				},
				on: {
					MOUSE_CLICK: {
						actions: AreaAction.RECORD_POINT,
						target: AreaState.WAITING_FOR_NEXT_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: AreaAction.RECORD_POINT,
						target: AreaState.WAITING_FOR_NEXT_POINT,
					},
					TEXT_INPUT: {
						guard: ({ event }) => (event as TextInputEvent).value.toUpperCase() === OBJECT_OPTION,
						target: AreaState.WAITING_FOR_CLICK_INSIDE_AREA,
					},
					ESC: {
						actions: AreaAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[AreaState.WAITING_FOR_NEXT_POINT]: {
				description: 'Select the next corner point',
				meta: {
					instructions: 'Select the next corner point, ENTER to show the area',
				},
				on: {
					DRAW: {
						actions: AreaAction.DRAW_TEMP_POLYGON,
					},
					MOUSE_CLICK: {
						actions: AreaAction.RECORD_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: AreaAction.RECORD_POINT,
					},
					RELATIVE_POINT_INPUT: {
						actions: AreaAction.RECORD_POINT,
					},
					NUMBER_INPUT: {
						actions: AreaAction.RECORD_POINT,
					},
					ENTER: {
						actions: AreaAction.SHOW_POLYGON_AREA,
						target: AreaState.INIT,
					},
					ESC: {
						target: AreaState.INIT,
					},
				},
			},
			[AreaState.WAITING_FOR_CLICK_INSIDE_AREA]: {
				description: 'Click inside a closed area',
				meta: {
					instructions: 'Click inside a closed area to show its area',
				},
				entry: () => {
					setShouldDrawHelpers(false);
					areaBoundaryPicker.reset();
				},
				on: {
					DRAW: {
						actions: AreaAction.DRAW_TEMP_BOUNDARY,
					},
					MOUSE_CLICK: {
						actions: AreaAction.SHOW_BOUNDARY_AREA,
					},
					ESC: {
						target: AreaState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[AreaAction.INIT_AREA_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					points: [],
				};
			}),
			[AreaAction.RECORD_POINT]: assign(({ context, event }) => {
				const point = getPointFromEvent(context.points.at(-1) ?? null, event as PointInputEvent);
				setAngleGuideOriginPoint(point);
				return {
					points: [...context.points, point],
				};
			}),
			[AreaAction.DRAW_TEMP_POLYGON]: ({ context, event }) => {
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities(getGuideLines([...context.points, mouseLocation]));
			},
			[AreaAction.SHOW_POLYGON_AREA]: ({ context }) => {
				if (context.points.length < 3) {
					toast.info('Select at least 3 points to calculate an area');
					return;
				}
				toast.info(formatAreaInfo(getPolygonAreaInfo(context.points)), { autoClose: false });
			},
			[AreaAction.DRAW_TEMP_BOUNDARY]: ({ event }) => {
				areaBoundaryPicker.drawPreview((event as DrawEvent).drawController.getWorldMouseLocation());
			},
			[AreaAction.SHOW_BOUNDARY_AREA]: ({ event }) => {
				const boundary = areaBoundaryPicker.findBoundaryAroundPoint(
					(event as MouseClickEvent).worldMouseLocation
				);
				if (!boundary) {
					toast.info('No closed area found around the clicked point');
					return;
				}
				toast.info(formatAreaInfo(getBoundaryAreaInfo(boundary)), { autoClose: false });
			},
			[AreaAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
