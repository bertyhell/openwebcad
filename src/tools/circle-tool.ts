import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { EPSILON, GUIDE_LINE_COLOR, GUIDE_LINE_STYLE, GUIDE_LINE_WIDTH } from '../App.consts.ts';
import { CircleEntity } from '../entities/CircleEntity';
import { LineEntity } from '../entities/LineEntity';
import { getCircleCenterThroughPoints } from '../helpers/arc-through-points.ts';
import { pointDistance } from '../helpers/distance-between-points';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import {
	addEntities,
	getActiveLineColor,
	getActiveLineWidth,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import {
	ActorEvent,
	type DrawEvent,
	type NumberInputEvent,
	type PointInputEvent,
	type StateEvent,
	type TextInputEvent,
	type ToolContext,
} from './tool.types';

const THREE_POINT_OPTION = 'T';
const CENTER_RADIUS_OPTION = 'C';

export enum CircleMode {
	CENTER_RADIUS = 'CENTER_RADIUS',
	THREE_POINT = 'THREE_POINT',
}

/**
 * The mode of the last circle is used again for the next circle
 */
let lastMode: CircleMode = CircleMode.CENTER_RADIUS;

export interface CircleContext extends ToolContext {
	centerPoint: Point | null;
	/**
	 * Points that were already clicked in the 3 point mode
	 */
	points: Point[];
}

export enum CircleState {
	INIT = 'INIT',
	WAITING_FOR_CENTER_POINT = 'WAITING_FOR_CENTER_POINT',
	WAITING_FOR_POINT_ON_CIRCLE = 'WAITING_FOR_POINT_ON_CIRCLE',
	WAITING_FOR_FIRST_POINT = 'WAITING_FOR_FIRST_POINT',
	WAITING_FOR_SECOND_POINT = 'WAITING_FOR_SECOND_POINT',
	WAITING_FOR_THIRD_POINT = 'WAITING_FOR_THIRD_POINT',
}

export enum CircleAction {
	INIT_CIRCLE_TOOL = 'INIT_CIRCLE_TOOL',
	RECORD_START_POINT = 'RECORD_START_POINT',
	DRAW_TEMP_CIRCLE = 'DRAW_TEMP_CIRCLE',
	DRAW_FINAL_CIRCLE = 'DRAW_FINAL_CIRCLE',
	SET_MODE = 'SET_MODE',
	CENTER_TO_FIRST_POINT = 'CENTER_TO_FIRST_POINT',
	FIRST_POINT_TO_CENTER = 'FIRST_POINT_TO_CENTER',
	RECORD_POINT = 'RECORD_POINT',
	DRAW_TEMP_LINE = 'DRAW_TEMP_LINE',
	DRAW_TEMP_THREE_POINT_CIRCLE = 'DRAW_TEMP_THREE_POINT_CIRCLE',
	DRAW_FINAL_THREE_POINT_CIRCLE = 'DRAW_FINAL_THREE_POINT_CIRCLE',
}

const POINT_EVENTS = ['MOUSE_CLICK', 'ABSOLUTE_POINT_INPUT', 'RELATIVE_POINT_INPUT'] as const;

function createCircle(center: Point, radius: number): CircleEntity {
	const circle = new CircleEntity(center, radius);
	circle.lineColor = getActiveLineColor();
	circle.lineWidth = getActiveLineWidth();
	return circle;
}

/**
 * Circle that passes through the 3 points, null when the points are on one line
 */
function createCircleThroughPoints(p1: Point, p2: Point, p3: Point): CircleEntity | null {
	const center = getCircleCenterThroughPoints(p1, p2, p3);
	if (!center) {
		return null;
	}
	return createCircle(center, pointDistance(center, p1));
}

/**
 * Dashed helper line between the points of the 3 point mode
 */
function createGuideLine(start: Point, end: Point): LineEntity {
	const line = new LineEntity(start, end);
	line.lineColor = GUIDE_LINE_COLOR;
	line.lineWidth = GUIDE_LINE_WIDTH;
	line.lineDash = GUIDE_LINE_STYLE;
	return line;
}

function getLastPoint(context: CircleContext): Point | null {
	return context.points[context.points.length - 1] ?? null;
}

/**
 * Radius from a typed number or from a point on the circle
 * A typed number is used as is, so a negative radius can be refused instead of silently flipping it
 */
function getRadius(centerPoint: Point, event: StateEvent): number {
	if (event.type === ActorEvent.NUMBER_INPUT) {
		return (event as NumberInputEvent).value;
	}
	return pointDistance(centerPoint, getPointFromEvent(centerPoint, event as PointInputEvent));
}

function hasValidRadius(context: CircleContext, event: StateEvent): boolean {
	return !!context.centerPoint && getRadius(context.centerPoint, event) > EPSILON;
}

/**
 * Draw the circle, or keep waiting for another point when the circle would have no size
 */
const finishCircleTransitions = [
	{
		guard: ({ context, event }: { context: CircleContext; event: StateEvent }) =>
			hasValidRadius(context, event),
		actions: CircleAction.DRAW_FINAL_CIRCLE,
		target: CircleState.INIT,
	},
	{
		actions: () => {
			toast.info('The radius has to be larger than 0');
		},
	},
];

/**
 * The second point has to differ from the first, otherwise every third point is on one line with them
 */
function isSecondPointValid(context: CircleContext, event: StateEvent): boolean {
	const firstPoint = getLastPoint(context);
	return (
		!!firstPoint &&
		!isPointEqual(firstPoint, getPointFromEvent(firstPoint, event as PointInputEvent))
	);
}

function isThirdPointValid(context: CircleContext, event: StateEvent): boolean {
	const [p1, p2] = context.points;
	const p3 = getPointFromEvent(getLastPoint(context), event as PointInputEvent);
	return !!getCircleCenterThroughPoints(p1, p2, p3);
}

export const circleToolStateMachine = createMachine(
	{
		types: {} as {
			context: CircleContext;
			events: StateEvent;
		},
		context: {
			centerPoint: null,
			points: [],
			type: Tool.CIRCLE,
		},
		initial: CircleState.INIT,
		states: {
			[CircleState.INIT]: {
				description: 'Initializing the circle tool',
				always: [
					{
						guard: () => lastMode === CircleMode.THREE_POINT,
						actions: CircleAction.INIT_CIRCLE_TOOL,
						target: CircleState.WAITING_FOR_FIRST_POINT,
					},
					{
						actions: CircleAction.INIT_CIRCLE_TOOL,
						target: CircleState.WAITING_FOR_CENTER_POINT,
					},
				],
			},
			[CircleState.WAITING_FOR_CENTER_POINT]: {
				description: 'Select the center point of the circle tool',
				meta: {
					instructions:
						'Select the center point of the circle, or [T]hree points to draw a circle through 3 points',
					instantOptions: [THREE_POINT_OPTION],
				},
				on: {
					MOUSE_CLICK: {
						actions: CircleAction.RECORD_START_POINT,
						target: CircleState.WAITING_FOR_POINT_ON_CIRCLE,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: CircleAction.RECORD_START_POINT,
						target: CircleState.WAITING_FOR_POINT_ON_CIRCLE,
					},
					TEXT_INPUT: {
						guard: ({ event }) =>
							(event as TextInputEvent).value.toUpperCase() === THREE_POINT_OPTION,
						actions: CircleAction.SET_MODE,
						target: CircleState.INIT,
					},
				},
			},
			[CircleState.WAITING_FOR_POINT_ON_CIRCLE]: {
				description: 'Select a point on the circle',
				meta: {
					instructions:
						'Select the point on the circle or type the radius, or [T]hree points to use the center as the first of 3 points',
					instantOptions: [THREE_POINT_OPTION],
				},
				on: {
					TEXT_INPUT: {
						guard: ({ event }) =>
							(event as TextInputEvent).value.toUpperCase() === THREE_POINT_OPTION,
						actions: [CircleAction.SET_MODE, CircleAction.CENTER_TO_FIRST_POINT],
						target: CircleState.WAITING_FOR_SECOND_POINT,
					},
					DRAW: {
						actions: CircleAction.DRAW_TEMP_CIRCLE,
					},
					MOUSE_CLICK: finishCircleTransitions,
					NUMBER_INPUT: finishCircleTransitions,
					ABSOLUTE_POINT_INPUT: finishCircleTransitions,
					RELATIVE_POINT_INPUT: finishCircleTransitions,
					ESC: {
						target: CircleState.INIT,
					},
				},
			},
			[CircleState.WAITING_FOR_FIRST_POINT]: {
				description: 'Select the first point on the circle',
				meta: {
					instructions:
						'Select the first point on the circle, or [C]enter and radius to draw a circle from its center',
					instantOptions: [CENTER_RADIUS_OPTION],
				},
				on: {
					MOUSE_CLICK: {
						actions: CircleAction.RECORD_POINT,
						target: CircleState.WAITING_FOR_SECOND_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: CircleAction.RECORD_POINT,
						target: CircleState.WAITING_FOR_SECOND_POINT,
					},
					TEXT_INPUT: {
						guard: ({ event }) =>
							(event as TextInputEvent).value.toUpperCase() === CENTER_RADIUS_OPTION,
						actions: CircleAction.SET_MODE,
						target: CircleState.INIT,
					},
				},
			},
			[CircleState.WAITING_FOR_SECOND_POINT]: {
				description: 'Select the second point on the circle',
				meta: {
					instructions:
						'Select the second point on the circle, or [C]enter and radius to use the first point as the center',
					instantOptions: [CENTER_RADIUS_OPTION],
				},
				on: {
					TEXT_INPUT: {
						guard: ({ event }) =>
							(event as TextInputEvent).value.toUpperCase() === CENTER_RADIUS_OPTION,
						actions: [CircleAction.SET_MODE, CircleAction.FIRST_POINT_TO_CENTER],
						target: CircleState.WAITING_FOR_POINT_ON_CIRCLE,
					},
					DRAW: {
						actions: CircleAction.DRAW_TEMP_LINE,
					},
					...Object.fromEntries(
						POINT_EVENTS.map((eventType) => [
							eventType,
							[
								{
									guard: ({ context, event }: { context: CircleContext; event: StateEvent }) =>
										isSecondPointValid(context, event),
									actions: CircleAction.RECORD_POINT,
									target: CircleState.WAITING_FOR_THIRD_POINT,
								},
								{
									actions: () =>
										toast.info('The second point has to be different from the first point'),
								},
							],
						])
					),
					ESC: {
						target: CircleState.INIT,
					},
				},
			},
			[CircleState.WAITING_FOR_THIRD_POINT]: {
				description: 'Select the third point on the circle',
				meta: {
					instructions: 'Select the third point on the circle',
				},
				on: {
					DRAW: {
						actions: CircleAction.DRAW_TEMP_THREE_POINT_CIRCLE,
					},
					...Object.fromEntries(
						POINT_EVENTS.map((eventType) => [
							eventType,
							[
								{
									guard: ({ context, event }: { context: CircleContext; event: StateEvent }) =>
										isThirdPointValid(context, event),
									actions: CircleAction.DRAW_FINAL_THREE_POINT_CIRCLE,
									target: CircleState.INIT,
								},
								{
									actions: () => toast.warn('The 3 points are on one line, select another point'),
								},
							],
						])
					),
					ESC: {
						target: CircleState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[CircleAction.INIT_CIRCLE_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				setAngleGuideOriginPoint(null);
				return {
					centerPoint: null,
					points: [],
				};
			}),
			[CircleAction.SET_MODE]: ({ event }) => {
				const option = (event as TextInputEvent).value.toUpperCase();
				lastMode =
					option === THREE_POINT_OPTION ? CircleMode.THREE_POINT : CircleMode.CENTER_RADIUS;
			},
			[CircleAction.CENTER_TO_FIRST_POINT]: assign(({ context }) => {
				setGhostHelperEntities([]);
				return {
					points: context.centerPoint ? [context.centerPoint] : [],
					centerPoint: null,
				};
			}),
			[CircleAction.FIRST_POINT_TO_CENTER]: assign(({ context }) => {
				setGhostHelperEntities([]);
				return {
					centerPoint: context.points[0] ?? null,
					points: [],
				};
			}),
			[CircleAction.RECORD_START_POINT]: assign(({ event }) => {
				const startPoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(startPoint);
				return {
					centerPoint: startPoint,
				};
			}),
			[CircleAction.DRAW_TEMP_CIRCLE]: ({ context, event }) => {
				const activeCircle = createCircle(
					context.centerPoint as Point,
					pointDistance(
						(event as DrawEvent).drawController.getWorldMouseLocation(),
						context.centerPoint as Point
					)
				);
				setGhostHelperEntities([activeCircle]);
			},
			[CircleAction.DRAW_FINAL_CIRCLE]: assign(({ context, event }) => {
				if (!context.centerPoint) {
					throw new Error(
						'Trying to DRAW_FINAL_CIRCLE when centerPoint is not yet defined in circle tool'
					);
				}
				const activeCircle = createCircle(
					context.centerPoint,
					getRadius(context.centerPoint, event)
				);
				addEntities([activeCircle], true);

				setGhostHelperEntities([]);
				return {
					centerPoint: null,
				};
			}),
			[CircleAction.RECORD_POINT]: assign(({ context, event }) => {
				const point = getPointFromEvent(getLastPoint(context), event as PointInputEvent);
				setAngleGuideOriginPoint(point);
				return {
					points: [...context.points, point],
				};
			}),
			[CircleAction.DRAW_TEMP_LINE]: ({ context, event }) => {
				const firstPoint = getLastPoint(context);
				if (!firstPoint) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				// Until the third point is known, the 2 points are the diameter of the circle
				const center = new Point(
					(firstPoint.x + mouseLocation.x) / 2,
					(firstPoint.y + mouseLocation.y) / 2
				);
				setGhostHelperEntities([
					createGuideLine(firstPoint, mouseLocation),
					createCircle(center, pointDistance(firstPoint, mouseLocation) / 2),
				]);
			},
			[CircleAction.DRAW_TEMP_THREE_POINT_CIRCLE]: ({ context, event }) => {
				const [p1, p2] = context.points;
				if (!p1 || !p2) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				const circle = createCircleThroughPoints(p1, p2, mouseLocation);
				setGhostHelperEntities([
					createGuideLine(p1, p2),
					createGuideLine(p2, mouseLocation),
					...(circle ? [circle] : []),
				]);
			},
			[CircleAction.DRAW_FINAL_THREE_POINT_CIRCLE]: assign(({ context, event }) => {
				const [p1, p2] = context.points;
				const p3 = getPointFromEvent(getLastPoint(context), event as PointInputEvent);
				const circle = createCircleThroughPoints(p1, p2, p3);
				if (circle) {
					addEntities([circle], true);
				}
				setGhostHelperEntities([]);
				return {
					points: [],
				};
			}),
		},
	}
);
