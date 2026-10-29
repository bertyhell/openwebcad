import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import { CircleEntity } from '../entities/CircleEntity.ts';
import type { Entity } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { getStarPoints } from '../helpers/star-points.ts';
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
import {
	ActorEvent,
	type DrawEvent,
	type NumberInputEvent,
	type PointInputEvent,
	type StateEvent,
	type ToolContext,
} from './tool.types';

const MIN_POINT_COUNT = 2;
const MAX_POINT_COUNT = 512;
const POINT_COUNT_TOAST_ID = 'star-point-count';
const POINT_COUNT_HINT = 'Arrow up/down changes the number of points';

/**
 * The point count and the ratio between the circles of the last star are used again for the next star
 */
let lastPointCount = 5;
let lastSecondRadiusRatio = 0.4;

export interface StarContext extends ToolContext {
	pointCount: number;
	center: Point | null;
	firstRadiusPoint: Point | null;
}

export enum StarState {
	INIT = 'INIT',
	WAITING_FOR_POINT_COUNT = 'WAITING_FOR_POINT_COUNT',
	WAITING_FOR_CENTER = 'WAITING_FOR_CENTER',
	WAITING_FOR_FIRST_RADIUS = 'WAITING_FOR_FIRST_RADIUS',
	WAITING_FOR_SECOND_RADIUS = 'WAITING_FOR_SECOND_RADIUS',
}

export enum StarAction {
	INIT_STAR_TOOL = 'INIT_STAR_TOOL',
	RECORD_POINT_COUNT = 'RECORD_POINT_COUNT',
	INCREASE_POINT_COUNT = 'INCREASE_POINT_COUNT',
	DECREASE_POINT_COUNT = 'DECREASE_POINT_COUNT',
	RECORD_CENTER = 'RECORD_CENTER',
	RECORD_FIRST_RADIUS = 'RECORD_FIRST_RADIUS',
	DRAW_TEMP_FIRST_CIRCLE = 'DRAW_TEMP_FIRST_CIRCLE',
	DRAW_TEMP_STAR = 'DRAW_TEMP_STAR',
	DRAW_FINAL_STAR = 'DRAW_FINAL_STAR',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

function isValidPointCount(value: number): boolean {
	return Number.isInteger(value) && value >= MIN_POINT_COUNT && value <= MAX_POINT_COUNT;
}

/**
 * Changes the point count with the arrow keys and shows the new count, since it isn't visible before the radius step
 */
function changePointCount(context: StarContext, delta: number): Partial<StarContext> {
	lastPointCount = Math.min(MAX_POINT_COUNT, Math.max(MIN_POINT_COUNT, context.pointCount + delta));
	const message = `Number of star points: ${lastPointCount}`;
	if (toast.isActive(POINT_COUNT_TOAST_ID)) {
		toast.update(POINT_COUNT_TOAST_ID, { render: message });
	} else {
		toast.info(message, { toastId: POINT_COUNT_TOAST_ID });
	}
	return {
		pointCount: lastPointCount,
	};
}

function getRadius(center: Point, point: Point): number {
	return Math.hypot(point.x - center.x, point.y - center.y);
}

/**
 * The second radius is typed as a number or picked as a point on the second circle
 */
function getSecondRadius(center: Point, event: PointInputEvent): number {
	if (event.type === ActorEvent.NUMBER_INPUT) {
		return Math.abs((event as NumberInputEvent).value);
	}
	return getRadius(center, getPointFromEvent(center, event));
}

function createStar(
	center: Point,
	firstRadiusPoint: Point,
	secondRadius: number,
	pointCount: number
): PolyLineEntity {
	const corners = getStarPoints(center, firstRadiusPoint, secondRadius, pointCount);
	const star = new PolyLineEntity(
		corners.map((corner, index) => new LineEntity(corner, corners[(index + 1) % corners.length]))
	);
	star.lineColor = getActiveLineColor();
	star.lineWidth = getActiveLineWidth();
	return star;
}

function createGhostCircle(center: Point, radius: number): CircleEntity {
	const circle = new CircleEntity(center, radius);
	circle.lineColor = getActiveLineColor();
	return circle;
}

/**
 * Star tool state machine
 * Draws a star: center, a star point on the first circle, then the second circle for the corners between the star points
 * UP and DOWN change the number of star points during every step
 */
export const starToolStateMachine = createMachine(
	{
		types: {} as {
			context: StarContext;
			events: StateEvent;
		},
		context: {
			pointCount: lastPointCount,
			center: null,
			firstRadiusPoint: null,
			type: Tool.STAR,
		},
		initial: StarState.INIT,
		on: {
			ARROW_UP: {
				actions: StarAction.INCREASE_POINT_COUNT,
			},
			ARROW_DOWN: {
				actions: StarAction.DECREASE_POINT_COUNT,
			},
		},
		states: {
			[StarState.INIT]: {
				description: 'Initializing the star tool',
				always: {
					actions: StarAction.INIT_STAR_TOOL,
					target: StarState.WAITING_FOR_POINT_COUNT,
				},
			},
			[StarState.WAITING_FOR_POINT_COUNT]: {
				description: 'Enter the number of star points',
				meta: {
					instructions: `Enter the number of star points, ENTER to keep the last number, or select the center. ${POINT_COUNT_HINT}`,
				},
				on: {
					NUMBER_INPUT: [
						{
							guard: ({ event }) => isValidPointCount((event as NumberInputEvent).value),
							actions: StarAction.RECORD_POINT_COUNT,
							target: StarState.WAITING_FOR_CENTER,
						},
						{
							actions: () =>
								toast.info(
									`The number of star points has to be a whole number from ${MIN_POINT_COUNT} to ${MAX_POINT_COUNT}`
								),
						},
					],
					ENTER: {
						target: StarState.WAITING_FOR_CENTER,
					},
					MOUSE_CLICK: {
						actions: StarAction.RECORD_CENTER,
						target: StarState.WAITING_FOR_FIRST_RADIUS,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StarAction.RECORD_CENTER,
						target: StarState.WAITING_FOR_FIRST_RADIUS,
					},
					ESC: {
						actions: StarAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[StarState.WAITING_FOR_CENTER]: {
				description: 'Select the center of the star',
				meta: {
					instructions: `Select the center of the star. ${POINT_COUNT_HINT}`,
				},
				on: {
					MOUSE_CLICK: {
						actions: StarAction.RECORD_CENTER,
						target: StarState.WAITING_FOR_FIRST_RADIUS,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StarAction.RECORD_CENTER,
						target: StarState.WAITING_FOR_FIRST_RADIUS,
					},
					ESC: {
						target: StarState.INIT,
					},
				},
			},
			[StarState.WAITING_FOR_FIRST_RADIUS]: {
				description: 'Select the tip of a star point on the first circle',
				meta: {
					instructions: `Select the tip of a star point or type the radius of the first circle. ${POINT_COUNT_HINT}`,
				},
				on: {
					DRAW: {
						actions: StarAction.DRAW_TEMP_FIRST_CIRCLE,
					},
					MOUSE_CLICK: {
						actions: StarAction.RECORD_FIRST_RADIUS,
						target: StarState.WAITING_FOR_SECOND_RADIUS,
					},
					NUMBER_INPUT: {
						actions: StarAction.RECORD_FIRST_RADIUS,
						target: StarState.WAITING_FOR_SECOND_RADIUS,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StarAction.RECORD_FIRST_RADIUS,
						target: StarState.WAITING_FOR_SECOND_RADIUS,
					},
					RELATIVE_POINT_INPUT: {
						actions: StarAction.RECORD_FIRST_RADIUS,
						target: StarState.WAITING_FOR_SECOND_RADIUS,
					},
					ESC: {
						target: StarState.INIT,
					},
				},
			},
			[StarState.WAITING_FOR_SECOND_RADIUS]: {
				description: 'Select the second circle for the corners between the star points',
				meta: {
					instructions: `Select a point on the second circle or type its radius. ${POINT_COUNT_HINT}`,
				},
				on: {
					DRAW: {
						actions: StarAction.DRAW_TEMP_STAR,
					},
					MOUSE_CLICK: {
						actions: StarAction.DRAW_FINAL_STAR,
						target: StarState.WAITING_FOR_CENTER,
					},
					NUMBER_INPUT: {
						actions: StarAction.DRAW_FINAL_STAR,
						target: StarState.WAITING_FOR_CENTER,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: StarAction.DRAW_FINAL_STAR,
						target: StarState.WAITING_FOR_CENTER,
					},
					RELATIVE_POINT_INPUT: {
						actions: StarAction.DRAW_FINAL_STAR,
						target: StarState.WAITING_FOR_CENTER,
					},
					ESC: {
						target: StarState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[StarAction.INIT_STAR_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					pointCount: lastPointCount,
					center: null,
					firstRadiusPoint: null,
				};
			}),
			[StarAction.RECORD_POINT_COUNT]: assign(({ event }) => {
				lastPointCount = (event as NumberInputEvent).value;
				return {
					pointCount: lastPointCount,
				};
			}),
			[StarAction.INCREASE_POINT_COUNT]: assign(({ context }) => changePointCount(context, 1)),
			[StarAction.DECREASE_POINT_COUNT]: assign(({ context }) => changePointCount(context, -1)),
			[StarAction.RECORD_CENTER]: assign(({ event }) => {
				const center = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(center);
				return {
					center,
				};
			}),
			[StarAction.RECORD_FIRST_RADIUS]: assign(({ context, event }) => {
				return {
					firstRadiusPoint: getPointFromEvent(context.center, event as PointInputEvent),
				};
			}),
			[StarAction.DRAW_TEMP_FIRST_CIRCLE]: ({ context, event }) => {
				if (!context.center) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				const firstRadius = getRadius(context.center, mouseLocation);
				// Preview the star with the circle ratio of the last star
				setGhostHelperEntities([
					createGhostCircle(context.center, firstRadius),
					createStar(
						context.center,
						mouseLocation,
						firstRadius * lastSecondRadiusRatio,
						context.pointCount
					),
				]);
			},
			[StarAction.DRAW_TEMP_STAR]: ({ context, event }) => {
				if (!context.center || !context.firstRadiusPoint) return;
				const secondRadius = getSecondRadius(context.center, event as PointInputEvent);
				const ghostEntities: Entity[] = [
					createGhostCircle(context.center, getRadius(context.center, context.firstRadiusPoint)),
					createGhostCircle(context.center, secondRadius),
					createStar(context.center, context.firstRadiusPoint, secondRadius, context.pointCount),
				];
				setGhostHelperEntities(ghostEntities);
			},
			[StarAction.DRAW_FINAL_STAR]: ({ context, event }) => {
				if (!context.center || !context.firstRadiusPoint) return;
				const secondRadius = getSecondRadius(context.center, event as PointInputEvent);
				const firstRadius = getRadius(context.center, context.firstRadiusPoint);
				if (firstRadius > 0) {
					lastSecondRadiusRatio = secondRadius / firstRadius;
				}
				addEntities(
					[createStar(context.center, context.firstRadiusPoint, secondRadius, context.pointCount)],
					true
				);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
			},
			[StarAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
