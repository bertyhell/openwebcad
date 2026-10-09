import type { Point } from '@flatten-js/core';
import { assign, createMachine } from 'xstate';
import { LineEntity } from '../entities/LineEntity';
import { applyActiveStyle } from '../helpers/apply-active-style';
import { getArcThroughPoints } from '../helpers/arc-through-points';
import { getPointFromEvent } from '../helpers/get-point-from-event';
import {
	addEntities,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { DrawEvent, PointInputEvent, StateEvent, ToolContext } from './tool.types';
import { createGuideLine } from './transform-tool.helpers';

export interface ArcContext extends ToolContext {
	startPoint: Point | null;
	pointOnArc: Point | null;
}

export enum ArcState {
	INIT = 'INIT',
	WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
	WAITING_FOR_POINT_ON_ARC = 'WAITING_FOR_POINT_ON_ARC',
	WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum ArcAction {
	INIT_ARC_TOOL = 'INIT_ARC_TOOL',
	RECORD_START_POINT = 'RECORD_START_POINT',
	RECORD_POINT_ON_ARC = 'RECORD_POINT_ON_ARC',
	DRAW_TEMP_LINE = 'DRAW_TEMP_LINE',
	DRAW_TEMP_ARC = 'DRAW_TEMP_ARC',
	DRAW_FINAL_ARC = 'DRAW_FINAL_ARC',
}

const POINT_EVENTS = [
	'MOUSE_CLICK',
	'NUMBER_INPUT',
	'ABSOLUTE_POINT_INPUT',
	'RELATIVE_POINT_INPUT',
] as const;

/**
 * Arc tool state machine
 * The arc is drawn through 3 points: the start point, a point on the arc and the end point
 */
export const arcToolStateMachine = createMachine(
	{
		types: {} as {
			context: ArcContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			pointOnArc: null,
			type: Tool.ARC,
		},
		initial: ArcState.INIT,
		states: {
			[ArcState.INIT]: {
				description: 'Initializing the arc tool',
				always: {
					actions: ArcAction.INIT_ARC_TOOL,
					target: ArcState.WAITING_FOR_START_POINT,
				},
			},
			[ArcState.WAITING_FOR_START_POINT]: {
				description: 'Select the start point of the arc',
				meta: {
					instructions: 'Select the start point of the arc',
				},
				on: {
					MOUSE_CLICK: {
						actions: ArcAction.RECORD_START_POINT,
						target: ArcState.WAITING_FOR_POINT_ON_ARC,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: ArcAction.RECORD_START_POINT,
						target: ArcState.WAITING_FOR_POINT_ON_ARC,
					},
				},
			},
			[ArcState.WAITING_FOR_POINT_ON_ARC]: {
				description: 'Select a point on the arc',
				meta: {
					instructions: 'Select a point the arc passes through',
				},
				on: {
					DRAW: { actions: ArcAction.DRAW_TEMP_LINE },
					...Object.fromEntries(
						POINT_EVENTS.map((eventType) => [
							eventType,
							{
								actions: ArcAction.RECORD_POINT_ON_ARC,
								target: ArcState.WAITING_FOR_END_POINT,
							},
						])
					),
					ESC: { target: ArcState.INIT },
				},
			},
			[ArcState.WAITING_FOR_END_POINT]: {
				description: 'Select the end point of the arc',
				meta: {
					instructions: 'Select the end point of the arc',
				},
				on: {
					DRAW: { actions: ArcAction.DRAW_TEMP_ARC },
					...Object.fromEntries(
						POINT_EVENTS.map((eventType) => [
							eventType,
							{
								actions: ArcAction.DRAW_FINAL_ARC,
								target: ArcState.INIT,
							},
						])
					),
					ESC: { target: ArcState.INIT },
				},
			},
		},
	},
	{
		actions: {
			[ArcAction.INIT_ARC_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					startPoint: null,
					pointOnArc: null,
				};
			}),
			[ArcAction.RECORD_START_POINT]: assign(({ event }) => {
				const startPoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(startPoint);
				return { startPoint };
			}),
			[ArcAction.RECORD_POINT_ON_ARC]: assign(({ context, event }) => {
				const pointOnArc = getPointFromEvent(context.startPoint, event as PointInputEvent);
				setAngleGuideOriginPoint(pointOnArc);
				return { pointOnArc };
			}),
			[ArcAction.DRAW_TEMP_LINE]: ({ context, event }) => {
				if (!context.startPoint) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities([createGuideLine(context.startPoint, mouseLocation)]);
			},
			[ArcAction.DRAW_TEMP_ARC]: ({ context, event }) => {
				if (!context.startPoint || !context.pointOnArc) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				const arc = getArcThroughPoints(context.startPoint, context.pointOnArc, mouseLocation);
				setGhostHelperEntities(
					arc
						? [applyActiveStyle(arc)]
						: [applyActiveStyle(new LineEntity(context.startPoint, mouseLocation))]
				);
			},
			[ArcAction.DRAW_FINAL_ARC]: ({ context, event }) => {
				if (!context.startPoint || !context.pointOnArc) return;
				const endPoint = getPointFromEvent(context.pointOnArc, event as PointInputEvent);
				const arc = getArcThroughPoints(context.startPoint, context.pointOnArc, endPoint);
				if (arc) {
					addEntities([applyActiveStyle(arc)], true);
				}
			},
		},
	}
);
