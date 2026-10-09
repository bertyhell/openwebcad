import type { Point } from '@flatten-js/core';
import { assign, createMachine } from 'xstate';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity';
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
import type { DrawEvent, PointInputEvent, StateEvent, ToolContext } from './tool.types';

export interface PolyLineContext extends ToolContext {
	points: Point[];
}

export enum PolyLineState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_POINT = 'WAITING_FOR_FIRST_POINT',
	WAITING_FOR_NEXT_POINT = 'WAITING_FOR_NEXT_POINT',
}

export enum PolyLineAction {
	INIT_POLYLINE_TOOL = 'INIT_POLYLINE_TOOL',
	ADD_POINT = 'ADD_POINT',
	DRAW_TEMP_POLYLINE = 'DRAW_TEMP_POLYLINE',
	FINISH_POLYLINE = 'FINISH_POLYLINE',
	CLOSE_POLYLINE = 'CLOSE_POLYLINE',
}

const POINT_EVENTS = [
	'MOUSE_CLICK',
	'NUMBER_INPUT',
	'ABSOLUTE_POINT_INPUT',
	'RELATIVE_POINT_INPUT',
] as const;

/**
 * Creates a polyline of straight segments through the points
 */
export function createPolyLineThroughPoints(points: Point[]): PolyLineEntity {
	const lines: LineEntity[] = [];
	for (let index = 0; index < points.length - 1; index++) {
		lines.push(new LineEntity(points[index], points[index + 1]));
	}
	return applyActiveStyle(new PolyLineEntity(lines));
}

/**
 * Clicking the first point again closes the polyline
 */
function isClosingClick({ context, event }: { context: PolyLineContext; event: StateEvent }) {
	if (event.type !== 'MOUSE_CLICK' || context.points.length < 3) {
		return false;
	}
	return getPointFromEvent(null, event as PointInputEvent).equalTo(context.points[0]);
}

/**
 * Polyline tool state machine
 * The user clicks (or types) points, every point adds a segment
 * ENTER finishes the polyline, clicking the first point closes it
 */
export const polyLineToolStateMachine = createMachine(
	{
		types: {} as {
			context: PolyLineContext;
			events: StateEvent;
		},
		context: {
			points: [],
			type: Tool.POLYLINE,
		},
		initial: PolyLineState.INIT,
		states: {
			[PolyLineState.INIT]: {
				description: 'Initializing the polyline tool',
				always: {
					actions: PolyLineAction.INIT_POLYLINE_TOOL,
					target: PolyLineState.WAITING_FOR_FIRST_POINT,
				},
			},
			[PolyLineState.WAITING_FOR_FIRST_POINT]: {
				description: 'Select the first point of the polyline',
				meta: {
					instructions: 'Select the first point of the polyline',
				},
				on: {
					MOUSE_CLICK: {
						actions: PolyLineAction.ADD_POINT,
						target: PolyLineState.WAITING_FOR_NEXT_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: PolyLineAction.ADD_POINT,
						target: PolyLineState.WAITING_FOR_NEXT_POINT,
					},
				},
			},
			[PolyLineState.WAITING_FOR_NEXT_POINT]: {
				description: 'Select the next point of the polyline',
				meta: {
					instructions: 'Select the next point, ENTER to finish, click the first point to close',
				},
				on: {
					DRAW: { actions: PolyLineAction.DRAW_TEMP_POLYLINE },
					...Object.fromEntries(
						POINT_EVENTS.map((eventType) => [
							eventType,
							[
								{
									guard: isClosingClick,
									actions: PolyLineAction.CLOSE_POLYLINE,
									target: PolyLineState.INIT,
								},
								{ actions: PolyLineAction.ADD_POINT },
							],
						])
					),
					ENTER: {
						actions: PolyLineAction.FINISH_POLYLINE,
						target: PolyLineState.INIT,
					},
					ESC: {
						actions: PolyLineAction.FINISH_POLYLINE,
						target: PolyLineState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[PolyLineAction.INIT_POLYLINE_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return { points: [] };
			}),
			[PolyLineAction.ADD_POINT]: assign(({ context, event }) => {
				const point = getPointFromEvent(context.points.at(-1) ?? null, event as PointInputEvent);
				if (context.points.at(-1)?.equalTo(point)) {
					return {}; // Ignore double clicks on the same point
				}
				setAngleGuideOriginPoint(point);
				return { points: [...context.points, point] };
			}),
			[PolyLineAction.DRAW_TEMP_POLYLINE]: ({ context, event }) => {
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				setGhostHelperEntities([createPolyLineThroughPoints([...context.points, mouseLocation])]);
			},
			[PolyLineAction.FINISH_POLYLINE]: ({ context }) => {
				setGhostHelperEntities([]);
				if (context.points.length >= 2) {
					addEntities([createPolyLineThroughPoints(context.points)], true);
				}
			},
			[PolyLineAction.CLOSE_POLYLINE]: ({ context }) => {
				setGhostHelperEntities([]);
				addEntities([createPolyLineThroughPoints([...context.points, context.points[0]])], true);
			},
		},
	}
);
