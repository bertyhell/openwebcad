import { type Point, Vector } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import { EPSILON } from '../App.consts.ts';
import { EllipseEntity } from '../entities/EllipseEntity.ts';
import { pointDistance } from '../helpers/distance-between-points.ts';
import { getSnappedMouseLocation } from '../helpers/get-closest-snap-point.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
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
import type { NumberInputEvent, PointInputEvent, StateEvent, ToolContext } from './tool.types';

export interface EllipseContext extends ToolContext {
	center: Point | null;
	majorAxisEnd: Point | null;
}

export enum EllipseState {
	INIT = 'INIT',
	WAITING_FOR_CENTER = 'WAITING_FOR_CENTER',
	WAITING_FOR_FIRST_AXIS = 'WAITING_FOR_FIRST_AXIS',
	WAITING_FOR_SECOND_AXIS = 'WAITING_FOR_SECOND_AXIS',
}

export enum EllipseAction {
	INIT_ELLIPSE_TOOL = 'INIT_ELLIPSE_TOOL',
	RECORD_CENTER = 'RECORD_CENTER',
	RECORD_FIRST_AXIS = 'RECORD_FIRST_AXIS',
	DRAW_TEMP_FIRST_AXIS = 'DRAW_TEMP_FIRST_AXIS',
	DRAW_TEMP_ELLIPSE = 'DRAW_TEMP_ELLIPSE',
	DRAW_FINAL_ELLIPSE = 'DRAW_FINAL_ELLIPSE',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Length of the second axis: the distance from the point to the line through the first axis
 */
function getSecondAxisLength(center: Point, majorAxisEnd: Point, point: Point): number {
	const axisDirection = new Vector(center, majorAxisEnd).normalize();
	const toPoint = new Vector(center, point);
	return Math.abs(axisDirection.cross(toPoint));
}

/**
 * Second axis length from a typed half length or from a point at that distance from the first axis
 */
function getSecondAxisLengthFromEvent(
	center: Point,
	majorAxisEnd: Point,
	event: StateEvent
): number {
	if (event.type === 'NUMBER_INPUT') {
		return Math.abs((event as NumberInputEvent).value);
	}
	return getSecondAxisLength(
		center,
		majorAxisEnd,
		getPointFromEvent(center, event as PointInputEvent)
	);
}

/**
 * Draw the ellipse, or keep the center and the first axis and wait for another point
 * when the second axis has no length, eg: the user clicked on the line through the first axis
 */
const finishEllipseTransitions = [
	{
		guard: ({ context, event }: { context: EllipseContext; event: StateEvent }) =>
			!!context.center &&
			!!context.majorAxisEnd &&
			getSecondAxisLengthFromEvent(context.center, context.majorAxisEnd, event) > EPSILON,
		actions: EllipseAction.DRAW_FINAL_ELLIPSE,
		target: EllipseState.INIT,
	},
	{
		actions: () => {
			toast.info('The second axis needs a length, select a point next to the first axis');
		},
	},
];

/**
 * Record the first axis, or keep waiting when it has no length, since the second axis is measured from it
 */
const recordFirstAxisTransitions = [
	{
		guard: ({ context, event }: { context: EllipseContext; event: StateEvent }) =>
			hasLength(context.center, event),
		actions: EllipseAction.RECORD_FIRST_AXIS,
		target: EllipseState.WAITING_FOR_SECOND_AXIS,
	},
	{
		actions: () => {
			toast.info('The first axis needs a length, select a point away from the center');
		},
	},
];

function createEllipse(
	center: Point,
	majorAxisEnd: Point,
	secondAxisLength: number
): EllipseEntity {
	const ellipse = new EllipseEntity(
		center,
		majorAxisEnd,
		secondAxisLength / pointDistance(center, majorAxisEnd)
	);
	ellipse.lineColor = getActiveLineColor();
	ellipse.lineWidth = getActiveLineWidth();
	return ellipse;
}

/**
 * Ellipse tool state machine
 * Draws an ellipse by its center, the end of its first axis and the length of its second axis
 */
export const ellipseToolStateMachine = createMachine(
	{
		types: {} as {
			context: EllipseContext;
			events: StateEvent;
		},
		context: {
			center: null,
			majorAxisEnd: null,
			type: Tool.ELLIPSE,
		},
		initial: EllipseState.INIT,
		states: {
			[EllipseState.INIT]: {
				description: 'Initializing the ellipse tool',
				always: {
					actions: EllipseAction.INIT_ELLIPSE_TOOL,
					target: EllipseState.WAITING_FOR_CENTER,
				},
			},
			[EllipseState.WAITING_FOR_CENTER]: {
				description: 'Select the center of the ellipse',
				meta: {
					instructions: 'Select the center of the ellipse',
				},
				on: {
					MOUSE_CLICK: {
						actions: EllipseAction.RECORD_CENTER,
						target: EllipseState.WAITING_FOR_FIRST_AXIS,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: EllipseAction.RECORD_CENTER,
						target: EllipseState.WAITING_FOR_FIRST_AXIS,
					},
					ESC: {
						actions: EllipseAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[EllipseState.WAITING_FOR_FIRST_AXIS]: {
				description: 'Select the end of the first axis',
				meta: {
					instructions: 'Select the end of the first axis or type its half length',
				},
				on: {
					DRAW: {
						actions: EllipseAction.DRAW_TEMP_FIRST_AXIS,
					},
					MOUSE_CLICK: recordFirstAxisTransitions,
					NUMBER_INPUT: recordFirstAxisTransitions,
					ABSOLUTE_POINT_INPUT: recordFirstAxisTransitions,
					RELATIVE_POINT_INPUT: recordFirstAxisTransitions,
					ESC: {
						target: EllipseState.INIT,
					},
				},
			},
			[EllipseState.WAITING_FOR_SECOND_AXIS]: {
				description: 'Select the length of the second axis',
				meta: {
					instructions: 'Select the length of the second axis or type its half length',
				},
				on: {
					DRAW: {
						actions: EllipseAction.DRAW_TEMP_ELLIPSE,
					},
					MOUSE_CLICK: finishEllipseTransitions,
					NUMBER_INPUT: finishEllipseTransitions,
					ABSOLUTE_POINT_INPUT: finishEllipseTransitions,
					ESC: {
						target: EllipseState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[EllipseAction.INIT_ELLIPSE_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					center: null,
					majorAxisEnd: null,
				};
			}),
			[EllipseAction.RECORD_CENTER]: assign(({ event }) => {
				const center = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(center);
				return {
					center,
				};
			}),
			[EllipseAction.RECORD_FIRST_AXIS]: assign(({ context, event }) => {
				const majorAxisEnd = getPointFromEvent(context.center, event as PointInputEvent);
				return {
					majorAxisEnd,
				};
			}),
			[EllipseAction.DRAW_TEMP_FIRST_AXIS]: ({ context }) => {
				if (!context.center) return;
				const mouseLocation = getSnappedMouseLocation();
				if (pointDistance(context.center, mouseLocation) === 0) return;
				// Preview a circle until the second axis is known
				setGhostHelperEntities([
					createEllipse(
						context.center,
						mouseLocation,
						pointDistance(context.center, mouseLocation)
					),
				]);
			},
			[EllipseAction.DRAW_TEMP_ELLIPSE]: ({ context }) => {
				if (!context.center || !context.majorAxisEnd) return;
				const mouseLocation = getSnappedMouseLocation();
				setGhostHelperEntities([
					createEllipse(
						context.center,
						context.majorAxisEnd,
						getSecondAxisLength(context.center, context.majorAxisEnd, mouseLocation)
					),
				]);
			},
			[EllipseAction.DRAW_FINAL_ELLIPSE]: ({ context, event }) => {
				if (!context.center || !context.majorAxisEnd) return;
				const secondAxisLength = getSecondAxisLengthFromEvent(
					context.center,
					context.majorAxisEnd,
					event
				);
				addEntities([createEllipse(context.center, context.majorAxisEnd, secondAxisLength)], true);
			},
			[EllipseAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);

function hasLength(center: Point | null, event: StateEvent): boolean {
	if (!center) return false;
	if (event.type === 'NUMBER_INPUT') {
		return (event as NumberInputEvent).value !== 0;
	}
	return pointDistance(center, getPointFromEvent(center, event as PointInputEvent)) > 0;
}
