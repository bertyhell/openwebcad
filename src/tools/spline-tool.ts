import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import { SnapPointType } from '../App.types.ts';
import { SplineEntity } from '../entities/SplineEntity.ts';
import { getSnappedMouseLocation } from '../helpers/get-closest-snap-point.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import {
	addEntities,
	getActiveLineColor,
	getActiveLineWidth,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
	setToolSnapPoints,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { PointInputEvent, StateEvent, ToolContext } from './tool.types';

export interface SplineContext extends ToolContext {
	fitPoints: Point[];
}

export enum SplineState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_POINT = 'WAITING_FOR_FIRST_POINT',
	WAITING_FOR_NEXT_POINT = 'WAITING_FOR_NEXT_POINT',
}

export enum SplineAction {
	INIT_SPLINE_TOOL = 'INIT_SPLINE_TOOL',
	RECORD_POINT = 'RECORD_POINT',
	DRAW_TEMP_SPLINE = 'DRAW_TEMP_SPLINE',
	DRAW_FINAL_SPLINE = 'DRAW_FINAL_SPLINE',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

function createSpline(fitPoints: Point[]): SplineEntity {
	const spline = new SplineEntity(fitPoints);
	spline.lineColor = getActiveLineColor();
	spline.lineWidth = getActiveLineWidth();
	return spline;
}

/**
 * A point on top of the previous point doesn't add a direction to the curve, eg: a double click
 */
function isNewPoint(context: SplineContext, event: StateEvent): boolean {
	const lastPoint = context.fitPoints.at(-1);
	return (
		!lastPoint || !isPointEqual(lastPoint, getPointFromEvent(lastPoint, event as PointInputEvent))
	);
}

/**
 * Record the point, duplicate points are ignored without a message, since a double click is a common way to place a point
 */
const recordPointTransition = {
	guard: ({ context, event }: { context: SplineContext; event: StateEvent }) =>
		isNewPoint(context, event),
	actions: SplineAction.RECORD_POINT,
};

/**
 * Spline tool state machine
 * Draws a smooth curve through the points the user picks, ENTER finishes the curve
 */
export const splineToolStateMachine = createMachine(
	{
		types: {} as {
			context: SplineContext;
			events: StateEvent;
		},
		context: {
			fitPoints: [],
			type: Tool.SPLINE,
		},
		initial: SplineState.INIT,
		states: {
			[SplineState.INIT]: {
				description: 'Initializing the spline tool',
				always: {
					actions: SplineAction.INIT_SPLINE_TOOL,
					target: SplineState.WAITING_FOR_FIRST_POINT,
				},
			},
			[SplineState.WAITING_FOR_FIRST_POINT]: {
				description: 'Select the first point of the spline',
				meta: {
					instructions: 'Select the first point of the spline',
				},
				on: {
					MOUSE_CLICK: {
						actions: SplineAction.RECORD_POINT,
						target: SplineState.WAITING_FOR_NEXT_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: SplineAction.RECORD_POINT,
						target: SplineState.WAITING_FOR_NEXT_POINT,
					},
					ESC: {
						actions: SplineAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[SplineState.WAITING_FOR_NEXT_POINT]: {
				description: 'Select the next point of the spline',
				meta: {
					instructions: 'Select the next point of the spline, ENTER to finish the spline',
				},
				on: {
					DRAW: {
						actions: SplineAction.DRAW_TEMP_SPLINE,
					},
					MOUSE_CLICK: recordPointTransition,
					NUMBER_INPUT: recordPointTransition,
					ABSOLUTE_POINT_INPUT: recordPointTransition,
					RELATIVE_POINT_INPUT: recordPointTransition,
					ENTER: [
						{
							// Duplicate points are never recorded, so 2 points are always 2 different points
							guard: ({ context }) => context.fitPoints.length >= 2,
							actions: SplineAction.DRAW_FINAL_SPLINE,
							target: SplineState.INIT,
						},
						{
							actions: () => {
								toast.info('A spline needs at least 2 different points, ESC to stop');
							},
						},
					],
					ESC: {
						target: SplineState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[SplineAction.INIT_SPLINE_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				setToolSnapPoints([]);
				return {
					fitPoints: [],
				};
			}),
			[SplineAction.RECORD_POINT]: assign(({ context, event }) => {
				const point = getPointFromEvent(context.fitPoints.at(-1) ?? null, event as PointInputEvent);
				setAngleGuideOriginPoint(point);
				const fitPoints = [...context.fitPoints, point];
				setToolSnapPoints(
					fitPoints.map((fitPoint) => ({ point: fitPoint, type: SnapPointType.Point }))
				);
				return {
					fitPoints,
				};
			}),
			[SplineAction.DRAW_TEMP_SPLINE]: ({ context }) => {
				const mouseLocation = getSnappedMouseLocation();
				setGhostHelperEntities([createSpline([...context.fitPoints, mouseLocation])]);
			},
			[SplineAction.DRAW_FINAL_SPLINE]: ({ context }) => {
				addEntities([createSpline(context.fitPoints)], true);
			},
			[SplineAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
