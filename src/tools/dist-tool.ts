import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { formatDistanceInfo, getDistanceInfo } from '../helpers/inquiry.ts';
import {
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { DrawEvent, PointInputEvent, StateEvent, ToolContext } from './tool.types';
import { createGuideLine } from './transform-tool.helpers.ts';

export interface DistContext extends ToolContext {
	startPoint: Point | null;
}

export enum DistState {
	INIT = 'INIT',
	WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
	WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum DistAction {
	INIT_DIST_TOOL = 'INIT_DIST_TOOL',
	RECORD_START_POINT = 'RECORD_START_POINT',
	DRAW_GUIDE_LINE = 'DRAW_GUIDE_LINE',
	SHOW_DISTANCE = 'SHOW_DISTANCE',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Dist tool state machine
 * Shows the distance, the difference in x and y and the angle between two points, without adding anything to the drawing
 */
export const distToolStateMachine = createMachine(
	{
		types: {} as {
			context: DistContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			type: Tool.DIST,
		},
		initial: DistState.INIT,
		states: {
			[DistState.INIT]: {
				description: 'Initializing the dist tool',
				always: {
					actions: DistAction.INIT_DIST_TOOL,
					target: DistState.WAITING_FOR_START_POINT,
				},
			},
			[DistState.WAITING_FOR_START_POINT]: {
				description: 'Select the first point',
				meta: {
					instructions: 'Select the first point to measure from',
				},
				on: {
					MOUSE_CLICK: {
						actions: DistAction.RECORD_START_POINT,
						target: DistState.WAITING_FOR_END_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: DistAction.RECORD_START_POINT,
						target: DistState.WAITING_FOR_END_POINT,
					},
					ESC: {
						actions: DistAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[DistState.WAITING_FOR_END_POINT]: {
				description: 'Select the second point',
				meta: {
					instructions: 'Select the second point to measure to',
				},
				on: {
					DRAW: {
						actions: DistAction.DRAW_GUIDE_LINE,
					},
					MOUSE_CLICK: {
						actions: DistAction.SHOW_DISTANCE,
						target: DistState.INIT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: DistAction.SHOW_DISTANCE,
						target: DistState.INIT,
					},
					RELATIVE_POINT_INPUT: {
						actions: DistAction.SHOW_DISTANCE,
						target: DistState.INIT,
					},
					ESC: {
						target: DistState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[DistAction.INIT_DIST_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					startPoint: null,
				};
			}),
			[DistAction.RECORD_START_POINT]: assign(({ event }) => {
				const startPoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(startPoint);
				return {
					startPoint,
				};
			}),
			[DistAction.DRAW_GUIDE_LINE]: ({ context, event }) => {
				if (!context.startPoint) return;
				setGhostHelperEntities([
					createGuideLine(
						context.startPoint,
						(event as DrawEvent).drawController.getWorldMouseLocation()
					),
				]);
			},
			[DistAction.SHOW_DISTANCE]: ({ context, event }) => {
				if (!context.startPoint) return;
				const endPoint = getPointFromEvent(context.startPoint, event as PointInputEvent);
				toast.info(formatDistanceInfo(getDistanceInfo(context.startPoint, endPoint)), {
					autoClose: false,
				});
			},
			[DistAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
