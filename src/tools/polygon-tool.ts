import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { getRegularPolygonPoints, PolygonMode } from '../helpers/polygon-points.ts';
import {
	addEntities,
	getActiveLineColor,
	getActiveLineWidth,
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
	NumberInputEvent,
	PointInputEvent,
	StateEvent,
	TextInputEvent,
	ToolContext,
} from './tool.types';

const MIN_SIDE_COUNT = 3;
const MAX_SIDE_COUNT = 1024;
const INSCRIBED_OPTION = 'I';
const CIRCUMSCRIBED_OPTION = 'C';

/**
 * The side count and mode of the last polygon are used again for the next polygon
 */
let lastSideCount = 6;
let lastMode = PolygonMode.INSCRIBED;

export interface PolygonContext extends ToolContext {
	sideCount: number;
	mode: PolygonMode;
	center: Point | null;
}

export enum PolygonState {
	INIT = 'INIT',
	WAITING_FOR_SIDE_COUNT = 'WAITING_FOR_SIDE_COUNT',
	WAITING_FOR_CENTER = 'WAITING_FOR_CENTER',
	WAITING_FOR_RADIUS = 'WAITING_FOR_RADIUS',
}

export enum PolygonAction {
	INIT_POLYGON_TOOL = 'INIT_POLYGON_TOOL',
	RECORD_SIDE_COUNT = 'RECORD_SIDE_COUNT',
	RECORD_CENTER = 'RECORD_CENTER',
	SET_MODE = 'SET_MODE',
	DRAW_TEMP_POLYGON = 'DRAW_TEMP_POLYGON',
	DRAW_FINAL_POLYGON = 'DRAW_FINAL_POLYGON',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

function isValidSideCount(value: number): boolean {
	return Number.isInteger(value) && value >= MIN_SIDE_COUNT && value <= MAX_SIDE_COUNT;
}

function createPolygon(context: PolygonContext, radiusPoint: Point): PolyLineEntity {
	const corners = getRegularPolygonPoints(
		context.center as Point,
		radiusPoint,
		context.sideCount,
		context.mode
	);
	const polygon = new PolyLineEntity(
		corners.map((corner, index) => new LineEntity(corner, corners[(index + 1) % corners.length]))
	);
	polygon.lineColor = getActiveLineColor();
	polygon.lineWidth = getActiveLineWidth();
	return polygon;
}

/**
 * Polygon tool state machine
 * Draws a regular polygon: number of sides, center, then a corner (inscribed) or the middle of a side (circumscribed)
 */
export const polygonToolStateMachine = createMachine(
	{
		types: {} as {
			context: PolygonContext;
			events: StateEvent;
		},
		context: {
			sideCount: lastSideCount,
			mode: lastMode,
			center: null,
			type: Tool.POLYGON,
		},
		initial: PolygonState.INIT,
		states: {
			[PolygonState.INIT]: {
				description: 'Initializing the polygon tool',
				always: {
					actions: PolygonAction.INIT_POLYGON_TOOL,
					target: PolygonState.WAITING_FOR_SIDE_COUNT,
				},
			},
			[PolygonState.WAITING_FOR_SIDE_COUNT]: {
				description: 'Enter the number of sides',
				meta: {
					instructions:
						'Enter the number of sides, ENTER to keep the last number, or select the center',
				},
				on: {
					NUMBER_INPUT: [
						{
							guard: ({ event }) => isValidSideCount((event as NumberInputEvent).value),
							actions: PolygonAction.RECORD_SIDE_COUNT,
							target: PolygonState.WAITING_FOR_CENTER,
						},
						{
							actions: () =>
								toast.info(
									`The number of sides has to be a whole number from ${MIN_SIDE_COUNT} to ${MAX_SIDE_COUNT}`
								),
						},
					],
					ENTER: {
						target: PolygonState.WAITING_FOR_CENTER,
					},
					MOUSE_CLICK: {
						actions: PolygonAction.RECORD_CENTER,
						target: PolygonState.WAITING_FOR_RADIUS,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: PolygonAction.RECORD_CENTER,
						target: PolygonState.WAITING_FOR_RADIUS,
					},
					ESC: {
						actions: PolygonAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[PolygonState.WAITING_FOR_CENTER]: {
				description: 'Select the center of the polygon',
				meta: {
					instructions: 'Select the center of the polygon',
				},
				on: {
					MOUSE_CLICK: {
						actions: PolygonAction.RECORD_CENTER,
						target: PolygonState.WAITING_FOR_RADIUS,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: PolygonAction.RECORD_CENTER,
						target: PolygonState.WAITING_FOR_RADIUS,
					},
					ESC: {
						target: PolygonState.INIT,
					},
				},
			},
			[PolygonState.WAITING_FOR_RADIUS]: {
				description: 'Select the radius of the polygon',
				meta: {
					instructions:
						'Select a corner or type the radius, [I]nscribed: corners on the circle, [C]ircumscribed: sides touch the circle',
					instantOptions: [INSCRIBED_OPTION, CIRCUMSCRIBED_OPTION],
				},
				on: {
					DRAW: {
						actions: PolygonAction.DRAW_TEMP_POLYGON,
					},
					TEXT_INPUT: {
						actions: PolygonAction.SET_MODE,
					},
					MOUSE_CLICK: {
						actions: PolygonAction.DRAW_FINAL_POLYGON,
						target: PolygonState.WAITING_FOR_CENTER,
					},
					NUMBER_INPUT: {
						actions: PolygonAction.DRAW_FINAL_POLYGON,
						target: PolygonState.WAITING_FOR_CENTER,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: PolygonAction.DRAW_FINAL_POLYGON,
						target: PolygonState.WAITING_FOR_CENTER,
					},
					RELATIVE_POINT_INPUT: {
						actions: PolygonAction.DRAW_FINAL_POLYGON,
						target: PolygonState.WAITING_FOR_CENTER,
					},
					ESC: {
						target: PolygonState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[PolygonAction.INIT_POLYGON_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					sideCount: lastSideCount,
					mode: lastMode,
					center: null,
				};
			}),
			[PolygonAction.RECORD_SIDE_COUNT]: assign(({ event }) => {
				lastSideCount = (event as NumberInputEvent).value;
				return {
					sideCount: lastSideCount,
				};
			}),
			[PolygonAction.RECORD_CENTER]: assign(({ event }) => {
				const center = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(center);
				return {
					center,
				};
			}),
			[PolygonAction.SET_MODE]: assign(({ context, event }) => {
				const option = (event as TextInputEvent).value.toUpperCase();
				if (option === INSCRIBED_OPTION) {
					lastMode = PolygonMode.INSCRIBED;
				} else if (option === CIRCUMSCRIBED_OPTION) {
					lastMode = PolygonMode.CIRCUMSCRIBED;
				} else {
					return context;
				}
				return {
					mode: lastMode,
				};
			}),
			[PolygonAction.DRAW_TEMP_POLYGON]: ({ context, event }) => {
				if (!context.center) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities([createPolygon(context, mouseLocation)]);
			},
			[PolygonAction.DRAW_FINAL_POLYGON]: ({ context, event }) => {
				if (!context.center) return;
				const radiusPoint = getPointFromEvent(context.center, event as PointInputEvent);
				addEntities([createPolygon(context, radiusPoint)], true);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
			},
			[PolygonAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
