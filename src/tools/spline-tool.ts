import type { Point } from '@flatten-js/core';
import { Actor, assign, createMachine } from 'xstate';
import { SplineEntity } from '../entities/SplineEntity.ts';
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
import type { DrawEvent, PointInputEvent, StateEvent, ToolContext } from './tool.types';

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
					MOUSE_CLICK: {
						actions: SplineAction.RECORD_POINT,
					},
					NUMBER_INPUT: {
						actions: SplineAction.RECORD_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: SplineAction.RECORD_POINT,
					},
					RELATIVE_POINT_INPUT: {
						actions: SplineAction.RECORD_POINT,
					},
					ENTER: {
						actions: SplineAction.DRAW_FINAL_SPLINE,
						target: SplineState.INIT,
					},
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
				return {
					fitPoints: [],
				};
			}),
			[SplineAction.RECORD_POINT]: assign(({ context, event }) => {
				const point = getPointFromEvent(context.fitPoints.at(-1) ?? null, event as PointInputEvent);
				setAngleGuideOriginPoint(point);
				return {
					fitPoints: [...context.fitPoints, point],
				};
			}),
			[SplineAction.DRAW_TEMP_SPLINE]: ({ context, event }) => {
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities([createSpline([...context.fitPoints, mouseLocation])]);
			},
			[SplineAction.DRAW_FINAL_SPLINE]: ({ context }) => {
				if (context.fitPoints.length < 2) return;
				addEntities([createSpline(context.fitPoints)], true);
			},
			[SplineAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
