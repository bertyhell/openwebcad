import type { Point } from '@flatten-js/core';
import { Actor, assign, createMachine } from 'xstate';
import type { Layer } from '../App.types';
import type { Entity } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { getSnappedMouseLocation } from '../helpers/get-closest-snap-point.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import {
	addEntities,
	getActiveLineColor,
	getActiveLineWidth,
	getEntities,
	getLayers,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
	undo,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { PointInputEvent, StateEvent, TextInputEvent, ToolContext } from './tool.types';

/**
 * A segment the line tool added to the drawing, with the drawing right after it was added
 */
interface DrawnSegment {
	lineId: string;
	entities: Entity[];
	layers: Layer[];
}

export interface LineContext extends ToolContext {
	/**
	 * The point the next segment starts from
	 */
	startPoint: Point | null;
	/**
	 * Every point of the connected segments that are being drawn, the first one is where the first segment started
	 */
	points: Point[];
	segments: DrawnSegment[];
}

export enum LineState {
	INIT = 'INIT',
	WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
	WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum LineAction {
	INIT_LINE_TOOL = 'INIT_LINE_TOOL',
	RECORD_START_POINT = 'RECORD_START_POINT',
	DRAW_TEMP_LINE = 'DRAW_TEMP_LINE',
	DRAW_FINAL_LINE = 'DRAW_FINAL_LINE',
	CLOSE_LINE = 'CLOSE_LINE',
	UNDO_LAST_SEGMENT = 'UNDO_LAST_SEGMENT',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

const CLOSE_OPTION = 'C';
const UNDO_OPTION = 'U';

function isOption(event: StateEvent, option: string): boolean {
	return (event as TextInputEvent).value?.toUpperCase() === option;
}

/**
 * Closing needs at least 2 segments, otherwise the closing segment would go back over the first one
 */
function canClose(context: LineContext): boolean {
	return context.points.length >= 3;
}

function createLine(startPoint: Point, endPoint: Point): LineEntity {
	const line = new LineEntity(startPoint, endPoint);
	line.lineColor = getActiveLineColor();
	line.lineWidth = getActiveLineWidth();
	return line;
}

/**
 * Line tool state machine
 * Every point the user picks adds a segment from the previous point, until ENTER or ESC
 * - [C]lose adds a segment back to the first point and finishes
 * - [U]ndo, or Ctrl+Z, removes the last segment and keeps drawing from the point before it
 */
export const lineToolStateMachine = createMachine(
	{
		types: {} as {
			context: LineContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			points: [],
			segments: [],
			type: Tool.LINE,
		},
		initial: LineState.INIT,
		states: {
			[LineState.INIT]: {
				description: 'Initializing the line tool',
				always: {
					actions: LineAction.INIT_LINE_TOOL,
					target: LineState.WAITING_FOR_START_POINT,
				},
			},
			[LineState.WAITING_FOR_START_POINT]: {
				description: 'Select the start point of the line',
				meta: {
					instructions: 'Select the start point of the line',
				},
				on: {
					MOUSE_CLICK: {
						actions: LineAction.RECORD_START_POINT,
						target: LineState.WAITING_FOR_END_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: LineAction.RECORD_START_POINT,
						target: LineState.WAITING_FOR_END_POINT,
					},
					ESC: {
						actions: LineAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[LineState.WAITING_FOR_END_POINT]: {
				description: 'Select the end point of the line',
				meta: {
					instructions: 'Select the end point of the line, [C]lose or [U]ndo',
					instantOptions: [CLOSE_OPTION, UNDO_OPTION],
				},
				on: {
					DRAW: {
						actions: LineAction.DRAW_TEMP_LINE,
					},
					MOUSE_CLICK: {
						actions: LineAction.DRAW_FINAL_LINE,
						target: LineState.WAITING_FOR_END_POINT,
					},
					NUMBER_INPUT: {
						actions: LineAction.DRAW_FINAL_LINE,
						target: LineState.WAITING_FOR_END_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: LineAction.DRAW_FINAL_LINE,
						target: LineState.WAITING_FOR_END_POINT,
					},
					RELATIVE_POINT_INPUT: {
						actions: LineAction.DRAW_FINAL_LINE,
						target: LineState.WAITING_FOR_END_POINT,
					},
					TEXT_INPUT: [
						{
							guard: ({ context, event }) => isOption(event, CLOSE_OPTION) && canClose(context),
							actions: LineAction.CLOSE_LINE,
							target: LineState.INIT,
						},
						{
							guard: ({ context, event }) =>
								isOption(event, UNDO_OPTION) && context.segments.length > 0,
							actions: LineAction.UNDO_LAST_SEGMENT,
						},
						{
							// Undoing the start point starts over
							guard: ({ event }) => isOption(event, UNDO_OPTION),
							target: LineState.INIT,
						},
					],
					// Ctrl+Z while drawing works like [U]ndo, once the start point is undone it undoes the previous command
					UNDO: [
						{
							guard: ({ context }) => context.segments.length > 0,
							actions: LineAction.UNDO_LAST_SEGMENT,
						},
						{ target: LineState.INIT },
					],
					ESC: {
						target: LineState.INIT,
					},
					ENTER: {
						target: LineState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[LineAction.INIT_LINE_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					startPoint: null,
					points: [],
					segments: [],
				};
			}),
			[LineAction.RECORD_START_POINT]: assign(({ event }) => {
				const startPoint = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(startPoint);
				return {
					startPoint,
					points: [startPoint],
					segments: [],
				};
			}),
			[LineAction.DRAW_TEMP_LINE]: ({ context }) => {
				// End the preview where a click would end the line, so it follows the snap marker
				setGhostHelperEntities([
					createLine(context.startPoint as Point, getSnappedMouseLocation()),
				]);
			},
			[LineAction.DRAW_FINAL_LINE]: assign(({ context, event }) => {
				if (!context.startPoint) {
					throw new Error('Start point is not set during DRAW_FINAL_LINE in LineEntity');
				}

				const endPoint = getPointFromEvent(context.startPoint, event as PointInputEvent);
				const activeLine = createLine(context.startPoint, endPoint);
				addEntities([activeLine], true);

				// Keep drawing from the last point
				setGhostHelperEntities([new LineEntity(endPoint, endPoint)]);
				setAngleGuideOriginPoint(endPoint);
				return {
					startPoint: endPoint,
					points: [...context.points, endPoint],
					segments: [
						...context.segments,
						{ lineId: activeLine.id, entities: getEntities(), layers: getLayers() },
					],
				};
			}),
			[LineAction.CLOSE_LINE]: ({ context }) => {
				if (!context.startPoint) {
					return;
				}
				addEntities([createLine(context.startPoint, context.points[0])], true);
			},
			[LineAction.UNDO_LAST_SEGMENT]: assign(({ context }) => {
				const lastSegment = context.segments.at(-1);
				if (!lastSegment) {
					return {};
				}
				if (getEntities() === lastSegment.entities && getLayers() === lastSegment.layers) {
					// Nothing changed since the segment was added, undoing it keeps the undo history clean,
					// so a later undo can't bring the segment back
					undo();
				} else {
					// Something else changed since, eg: a layer or a delete, so only remove the segment, if it is still there
					setEntities(
						getEntities().filter((entity) => entity.id !== lastSegment.lineId),
						true
					);
				}
				const points = context.points.slice(0, -1);
				const startPoint = points.at(-1) ?? null;
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(startPoint);
				return {
					startPoint,
					points,
					segments: context.segments.slice(0, -1),
				};
			}),
			[LineAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
