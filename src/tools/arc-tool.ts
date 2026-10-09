import type { Point } from '@flatten-js/core';
import { assign, createMachine } from 'xstate';
import { ArcEntity } from '../entities/ArcEntity';
import { applyActiveStyle } from '../helpers/apply-active-style';
import { getPointFromEvent } from '../helpers/get-point-from-event';
import {
	addEntities,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type {
	DrawEvent,
	NumberInputEvent,
	PointInputEvent,
	StateEvent,
	TextInputEvent,
	ToolContext,
} from './tool.types';
import { createGuideLine } from './transform-tool.helpers';

export interface ArcContext extends ToolContext {
	centerPoint: Point | null;
	startPoint: Point | null;
	inverted: boolean;
}

export enum ArcState {
	INIT = 'INIT',
	WAITING_FOR_CENTER_POINT = 'WAITING_FOR_CENTER_POINT',
	WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
	WAITING_FOR_END_ANGLE = 'WAITING_FOR_END_ANGLE',
}

export enum ArcAction {
	INIT_ARC_TOOL = 'INIT_ARC_TOOL',
	RECORD_CENTER_POINT = 'RECORD_CENTER_POINT',
	RECORD_START_POINT = 'RECORD_START_POINT',
	DRAW_TEMP_RADIUS = 'DRAW_TEMP_RADIUS',
	DRAW_TEMP_ARC = 'DRAW_TEMP_ARC',
	DRAW_FINAL_ARC = 'DRAW_FINAL_ARC',
}

const POINT_EVENTS = [
	'MOUSE_CLICK',
	'NUMBER_INPUT',
	'ABSOLUTE_POINT_INPUT',
	'RELATIVE_POINT_INPUT',
] as const;

const END_ANGLE_EVENTS = ['MOUSE_CLICK', 'NUMBER_INPUT', 'ABSOLUTE_POINT_INPUT'] as const;

function getAngle(centerPoint: Point, point: Point): number {
	return Math.atan2(point.y - centerPoint.y, point.x - centerPoint.x);
}

/**
 * Creates the arc from the center, the start point (radius + start angle) and the end angle
 * By default the smallest arc between the start and end angle is used, inverted takes the other side
 */
function createArc(
	centerPoint: Point,
	startPoint: Point,
	endAngle: number,
	inverted: boolean
): ArcEntity | null {
	const radius = centerPoint.distanceTo(startPoint)[0];
	if (radius === 0) return null;
	const startAngle = getAngle(centerPoint, startPoint);
	const counterClockwiseSweep =
		(((endAngle - startAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
	const counterClockwise = counterClockwiseSweep <= Math.PI;
	return new ArcEntity(
		centerPoint,
		radius,
		startAngle,
		endAngle,
		inverted ? !counterClockwise : counterClockwise
	);
}

/**
 * Arc tool state machine
 * The arc is drawn by selecting the center, a start point (defines the radius and start angle) and the end angle
 */
export const arcToolStateMachine = createMachine(
	{
		types: {} as {
			context: ArcContext;
			events: StateEvent;
		},
		context: {
			centerPoint: null,
			startPoint: null,
			inverted: false,
			type: Tool.ARC,
		},
		initial: ArcState.INIT,
		states: {
			[ArcState.INIT]: {
				description: 'Initializing the arc tool',
				always: {
					actions: ArcAction.INIT_ARC_TOOL,
					target: ArcState.WAITING_FOR_CENTER_POINT,
				},
			},
			[ArcState.WAITING_FOR_CENTER_POINT]: {
				description: 'Select the center point of the arc',
				meta: {
					instructions: 'Select the center point of the arc',
				},
				on: {
					MOUSE_CLICK: {
						actions: ArcAction.RECORD_CENTER_POINT,
						target: ArcState.WAITING_FOR_START_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: ArcAction.RECORD_CENTER_POINT,
						target: ArcState.WAITING_FOR_START_POINT,
					},
				},
			},
			[ArcState.WAITING_FOR_START_POINT]: {
				description: 'Select the start point of the arc',
				meta: {
					instructions: 'Select the start point of the arc or type the radius',
				},
				on: {
					DRAW: { actions: ArcAction.DRAW_TEMP_RADIUS },
					...Object.fromEntries(
						POINT_EVENTS.map((eventType) => [
							eventType,
							{
								actions: ArcAction.RECORD_START_POINT,
								target: ArcState.WAITING_FOR_END_ANGLE,
							},
						])
					),
					ESC: { target: ArcState.INIT },
				},
			},
			[ArcState.WAITING_FOR_END_ANGLE]: {
				description: 'Select the end angle of the arc',
				meta: {
					instructions:
						'Select the end angle of the arc, type the arc angle in degrees, or [I]nvert to use the other side of the arc',
					instantOptions: ['I'],
				},
				on: {
					DRAW: { actions: ArcAction.DRAW_TEMP_ARC },
					TEXT_INPUT: {
						guard: ({ event }) => (event as TextInputEvent).value.toUpperCase() === 'I',
						actions: assign(({ context }) => ({ inverted: !context.inverted })),
					},
					...Object.fromEntries(
						END_ANGLE_EVENTS.map((eventType) => [
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
					centerPoint: null,
					startPoint: null,
					inverted: false,
				};
			}),
			[ArcAction.RECORD_CENTER_POINT]: assign(({ event }) => {
				const centerPoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(centerPoint);
				return { centerPoint };
			}),
			[ArcAction.RECORD_START_POINT]: assign(({ context, event }) => {
				const startPoint = getPointFromEvent(context.centerPoint, event as PointInputEvent);
				return { startPoint };
			}),
			[ArcAction.DRAW_TEMP_RADIUS]: ({ context, event }) => {
				if (!context.centerPoint) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities([createGuideLine(context.centerPoint, mouseLocation)]);
			},
			[ArcAction.DRAW_TEMP_ARC]: ({ context, event }) => {
				if (!context.centerPoint || !context.startPoint) return;
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				const arc = createArc(
					context.centerPoint,
					context.startPoint,
					getAngle(context.centerPoint, mouseLocation),
					context.inverted
				);
				setGhostHelperEntities([
					createGuideLine(context.centerPoint, context.startPoint),
					createGuideLine(context.centerPoint, mouseLocation),
					...(arc ? [applyActiveStyle(arc)] : []),
				]);
			},
			[ArcAction.DRAW_FINAL_ARC]: ({ context, event }) => {
				if (!context.centerPoint || !context.startPoint) return;
				let arc: ArcEntity | null;
				if (event.type === 'NUMBER_INPUT') {
					// The typed number is the exact sweep angle in degrees: positive is counterclockwise, negative clockwise
					// Invert flips the direction
					const degrees = (event as NumberInputEvent).value;
					const radius = context.centerPoint.distanceTo(context.startPoint)[0];
					const startAngle = getAngle(context.centerPoint, context.startPoint);
					const counterClockwise = degrees >= 0 !== context.inverted;
					const sweep = (Math.abs(degrees) * Math.PI) / 180;
					const endAngle = startAngle + (counterClockwise ? sweep : -sweep);
					arc =
						radius === 0
							? null
							: new ArcEntity(context.centerPoint, radius, startAngle, endAngle, counterClockwise);
				} else {
					const endPoint = getPointFromEvent(context.centerPoint, event as PointInputEvent);
					arc = createArc(
						context.centerPoint,
						context.startPoint,
						getAngle(context.centerPoint, endPoint),
						context.inverted
					);
				}
				if (arc) {
					addEntities([applyActiveStyle(arc)], true);
				}
			},
		},
	}
);
