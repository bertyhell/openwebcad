import { Point, Vector } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { MEASUREMENT_DEFAULT_OFFSET, TO_RADIANS } from '../App.consts';
import { MeasurementEntity } from '../entities/MeasurementEntity';
import { getSnappedMouseLocation } from '../helpers/get-closest-snap-point.ts';
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
	type NumberInputEvent,
	type PointInputEvent,
	type StateEvent,
	type ToolContext,
} from './tool.types';

export interface MeasurementContext extends ToolContext {
	startPoint: Point | null;
	endPoint: Point | null;
}

export enum MeasurementState {
	INIT = 'INIT',
	WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
	WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
	WAITING_FOR_OFFSET = 'WAITING_FOR_OFFSET',
}

export enum MeasurementAction {
	INIT_MEASUREMENT_TOOL = 'INIT_MEASUREMENT_TOOL',
	RECORD_START_POINT = 'RECORD_START_POINT',
	RECORD_END_POINT = 'RECORD_END_POINT',
	DRAW_TEMP_MEASUREMENT = 'DRAW_TEMP_MEASUREMENT',
	DRAW_FINAL_MEASUREMENT = 'DRAW_FINAL_MEASUREMENT',
}

/**
 * Record the end point, or keep waiting when it is on the start point, since a zero length measurement can't be drawn
 */
const recordEndPointTransitions = [
	{
		guard: ({ context, event }: { context: MeasurementContext; event: StateEvent }) =>
			!!context.startPoint &&
			!isPointEqual(
				context.startPoint,
				getPointFromEvent(context.startPoint, event as PointInputEvent)
			),
		actions: MeasurementAction.RECORD_END_POINT,
		target: MeasurementState.WAITING_FOR_OFFSET,
	},
	{
		actions: () => {
			toast.info('The end point has to be different from the start point');
		},
	},
];

/**
 * The offset point from a clicked or typed point, or from a typed distance
 * A typed distance is measured perpendicular to the measured line, on the side of the mouse,
 * a negative distance puts the dimension line on the other side
 */
function getOffsetPoint(startPoint: Point, endPoint: Point, event: StateEvent): Point {
	if (event.type !== ActorEvent.NUMBER_INPUT) {
		return getPointFromEvent(endPoint, event as PointInputEvent);
	}
	const { value, worldMouseLocation } = event as NumberInputEvent;
	const normal = new Vector(startPoint, endPoint).normalize().rotate90CCW();
	const side = new Vector(startPoint, worldMouseLocation).dot(normal) < 0 ? -1 : 1;
	const middle = new Point((startPoint.x + endPoint.x) / 2, (startPoint.y + endPoint.y) / 2);
	return middle.translate(normal.multiply(side * value));
}

export const measurementToolStateMachine = createMachine(
	{
		types: {} as {
			context: MeasurementContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			endPoint: null,
			type: Tool.DIMLINEAR,
		},
		initial: MeasurementState.INIT,
		states: {
			[MeasurementState.INIT]: {
				description: 'Initializing the line tool',
				always: {
					actions: MeasurementAction.INIT_MEASUREMENT_TOOL,
					target: MeasurementState.WAITING_FOR_START_POINT,
				},
			},
			[MeasurementState.WAITING_FOR_START_POINT]: {
				description: 'Select the start point of the measurement',
				meta: {
					instructions: 'Select the start point of the measurement',
				},
				on: {
					MOUSE_CLICK: {
						actions: MeasurementAction.RECORD_START_POINT,
						target: MeasurementState.WAITING_FOR_END_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: MeasurementAction.RECORD_START_POINT,
						target: MeasurementState.WAITING_FOR_END_POINT,
					},
				},
			},
			[MeasurementState.WAITING_FOR_END_POINT]: {
				description: 'Select the end point of the measurement',
				meta: {
					instructions: 'Select the end point of the measurement',
				},
				on: {
					DRAW: {
						actions: MeasurementAction.DRAW_TEMP_MEASUREMENT,
					},
					MOUSE_CLICK: recordEndPointTransitions,
					NUMBER_INPUT: recordEndPointTransitions,
					ABSOLUTE_POINT_INPUT: recordEndPointTransitions,
					RELATIVE_POINT_INPUT: recordEndPointTransitions,
					ESC: {
						target: MeasurementState.INIT,
					},
				},
			},
			[MeasurementState.WAITING_FOR_OFFSET]: {
				description: 'Select the offset to display the measurement at',
				meta: {
					instructions: 'Select the offset to display the measurement at',
				},
				on: {
					DRAW: {
						actions: MeasurementAction.DRAW_TEMP_MEASUREMENT,
					},
					MOUSE_CLICK: {
						actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
						target: MeasurementState.INIT,
					},
					NUMBER_INPUT: {
						actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
						target: MeasurementState.INIT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
						target: MeasurementState.INIT,
					},
					RELATIVE_POINT_INPUT: {
						actions: MeasurementAction.DRAW_FINAL_MEASUREMENT,
						target: MeasurementState.INIT,
					},
					ESC: {
						target: MeasurementState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[MeasurementAction.INIT_MEASUREMENT_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					startPoint: null,
					endPoint: null,
				};
			}),
			[MeasurementAction.RECORD_START_POINT]: assign(({ event }) => {
				const startPoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(startPoint);
				return {
					startPoint,
				};
			}),
			[MeasurementAction.RECORD_END_POINT]: assign(({ context, event }) => {
				const endPoint = getPointFromEvent(context.startPoint, event as PointInputEvent);
				setAngleGuideOriginPoint(endPoint);
				return {
					...context,
					endPoint,
				};
			}),
			[MeasurementAction.DRAW_TEMP_MEASUREMENT]: ({ context }) => {
				const startPoint = context.startPoint as Point;

				let endPoint: Point;
				let offsetPoint: Point;
				if (!context.endPoint) {
					// User has drawn startPoint, but not yet endPoint
					// Endpoint should be the mouse location and offset should be MEASUREMENT_DEFAULT_OFFSET to either direction
					endPoint = getSnappedMouseLocation();

					if (isPointEqual(startPoint, endPoint)) {
						return; // Cannot draw temp measurement when start and endpoint are equal
					}

					const normalVector = new Vector(startPoint, endPoint)
						.rotate(-90 * TO_RADIANS)
						.normalize();
					offsetPoint = startPoint
						.clone()
						.translate(normalVector.multiply(MEASUREMENT_DEFAULT_OFFSET));
				} else {
					// User has already selected a startPoint and endPoint
					// The offsetPoint should be set to the mouse location
					endPoint = context.endPoint as Point;
					offsetPoint = getSnappedMouseLocation();
				}

				const activeMeasurement = new MeasurementEntity(
					context.startPoint as Point,
					endPoint,
					offsetPoint
				);
				activeMeasurement.lineColor = getActiveLineColor();
				activeMeasurement.lineWidth = getActiveLineWidth();
				setGhostHelperEntities([activeMeasurement]);
			},
			[MeasurementAction.DRAW_FINAL_MEASUREMENT]: ({ context, event }) => {
				const offsetPoint = getOffsetPoint(
					context.startPoint as Point,
					context.endPoint as Point,
					event
				);
				const activeMeasurement = new MeasurementEntity(
					context.startPoint as Point,
					context.endPoint as Point,
					offsetPoint
				);
				activeMeasurement.lineColor = getActiveLineColor();
				activeMeasurement.lineWidth = getActiveLineWidth();
				addEntities([activeMeasurement], true);
			},
		},
	}
);
