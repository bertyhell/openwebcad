import {type Point, Vector} from '@flatten-js/core';
import {assign, createMachine, sendTo} from 'xstate';
import {GUIDE_LINE_COLOR, GUIDE_LINE_STYLE, GUIDE_LINE_WIDTH, TO_RADIANS} from '../App.consts.ts';
import type {Entity} from '../entities/Entity';
import {LineEntity} from "../entities/LineEntity.ts";
import {getPointFromEvent} from "../helpers/get-point-from-event.ts";
import {
	addEntities,
	getActiveLayerId,
	getSelectedEntities,
	getSelectedEntityIds,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import {Tool} from '../tools';
import {CopyAction} from './copy-tool.ts';
import {selectToolStateMachine} from './select-tool.ts';
import type {
	AbsolutePointInputEvent,
	DrawEvent,
	MouseClickEvent,
	NumberInputEvent,
	StateEvent,
	TextInputEvent,
	ToolContext,
} from './tool.types';

export enum ArrayState {
	INIT = 'INIT',
	WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
	CHECK_SELECTION = 'CHECK_SELECTION',
	ASK_COPY_MODE = 'ASK_COPY_MODE',
	ASK_NUMBER_OF_COPIES = 'ASK_NUMBER_OF_COPIES',
	LINEAR_WAITING_FOR_START_POINT = 'LINEAR_WAITING_FOR_START_POINT',
	LINEAR_WAITING_FOR_END_POINT = 'LINEAR_WAITING_FOR_END_POINT',
	RADIAL_WAITING_FOR_PIVOT_POINT = 'RADIAL_WAITING_FOR_PIVOT_POINT',
	RADIAL_WAITING_FOR_ANGLE = 'RADIAL_WAITING_FOR_ANGLE',
	EXECUTE_COPY = 'EXECUTE_COPY',
}

export enum ArrayAction {
	INIT_ARRAY_TOOL = 'INIT_ARRAY_TOOL',
	PERFORM_COPY = 'PERFORM_COPY',
	DESELECT_ENTITIES = 'DESELECT_ENTITIES',
	DRAW_TEMP_DISTANCE_LINE = 'DRAW_TEMP_DISTANCE_LINE',
}

export interface ArrayContext extends ToolContext {
	copyMode: CopyMode | null;
	startDistanceVector: Point | null;
	endDistanceVector: Point | null;
	pivotPoint: Point | null;
	angleStep: number | null;
	numberOfCopies: number;
}

enum CopyMode {
	LINEAR = 'LINEAR',
	RADIAL = 'RADIAL',
}

const initialArrayContext: ArrayContext = {
	copyMode: null,
	startDistanceVector: null,
	endDistanceVector: null,
	pivotPoint: null,
	angleStep: null,
	numberOfCopies: 0,
	type: Tool.ARRAY,
};

export const arrayToolStateMachine = createMachine(
	{
		types: {} as {
			context: ArrayContext;
			events: StateEvent;
		},
		context: initialArrayContext,
		initial: ArrayState.INIT,
		states: {
			[ArrayState.INIT]: {
				description: 'Initializing the array copy tool',
				always: {
					actions: ArrayState.INIT,
					target: ArrayState.CHECK_SELECTION,
				},
			},
			[ArrayState.WAITING_FOR_SELECTION]: {
				description: 'Select what you want to copy',
				meta: {
					instructions: 'Select what you want to copy, then ENTER',
				},
				invoke: {
					id: 'selectToolInsideTheCopyTool',
					src: selectToolStateMachine,
					onDone: {
						actions: assign(() => {
							return initialArrayContext;
						}),
						target: ArrayState.CHECK_SELECTION,
					},
				},
				on: {
					MOUSE_CLICK: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideTheCopyTool', ({ event }) => {
							return event;
						}),
					},
					ESC: {
						actions: [ArrayAction.DESELECT_ENTITIES, ArrayAction.INIT_ARRAY_TOOL],
					},
					ENTER: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideTheCopyTool', ({ event }) => {
							return event;
						}),
					},
					DRAW: {
						// Forward the event to the select tool
						actions: sendTo('selectToolInsideTheCopyTool', ({ event }) => {
							return event;
						}),
					},
				},
			},
			[ArrayState.CHECK_SELECTION]: {
				description: 'Check if there is something selected',
				always: [
					{
						guard: () => {
							return getSelectedEntityIds().length > 0;
						},
						target: ArrayState.ASK_COPY_MODE,
					},
					{
						guard: () => {
							return getSelectedEntityIds().length === 0;
						},
						target: ArrayState.WAITING_FOR_SELECTION,
					},
				],
			},
			[ArrayState.ASK_COPY_MODE]: {
				meta: { instructions: 'Choose copy mode: Linear (L) or Radial (R), ENTER for Linear' },
				on: {
					TEXT_INPUT: {
						actions: assign(({ event }) => {
							return {
								copyMode:
									(event as TextInputEvent).value === 'R' ? CopyMode.RADIAL : CopyMode.LINEAR,
							};
						}),
						target: ArrayState.ASK_NUMBER_OF_COPIES,
					},
					ENTER: {
						actions: assign(() => ({
							copyMode: CopyMode.LINEAR,
						})),
						target: ArrayState.ASK_NUMBER_OF_COPIES,
					},
					ESC: {
						actions: ArrayAction.INIT_ARRAY_TOOL,
					},
				},
			},
			[ArrayState.ASK_NUMBER_OF_COPIES]: {
				meta: { instructions: 'Enter number of copies' },
				on: {
					NUMBER_INPUT: [
						{
							guard: ({ context }) => {
								return context.copyMode === CopyMode.LINEAR;
							},
							actions: assign(({ event }) => ({
								numberOfCopies: (event as NumberInputEvent).value,
							})),
							target: ArrayState.LINEAR_WAITING_FOR_START_POINT,
						},
						{
							guard: ({ context }) => {
								return context.copyMode === CopyMode.RADIAL;
							},
							actions: assign(({ event }) => ({
								numberOfCopies: (event as NumberInputEvent).value,
							})),
							target: ArrayState.RADIAL_WAITING_FOR_PIVOT_POINT,
						},
					],
					ESC: {
						actions: ArrayAction.INIT_ARRAY_TOOL,
					},
				},
			},
			[ArrayState.LINEAR_WAITING_FOR_START_POINT]: {
				meta: { instructions: 'Click to define the start of the distance vector' },
				on: {
					ABSOLUTE_POINT_INPUT: {
						actions: assign(({ event }) => ({
							startDistanceVector: (event as AbsolutePointInputEvent).value,
						})),
						target: ArrayState.EXECUTE_COPY,
					},
					MOUSE_CLICK: {
						actions: assign(({ event }) => ({
							startDistanceVector: (event as MouseClickEvent).worldMouseLocation,
						})),
						target: ArrayState.LINEAR_WAITING_FOR_END_POINT,
					},
					ESC: {
						actions: ArrayAction.INIT_ARRAY_TOOL,
					},
				},
			},
			[ArrayState.LINEAR_WAITING_FOR_END_POINT]: {
				meta: { instructions: 'Click to define the end of the distance vector' },
				on: {
					RELATIVE_POINT_INPUT: {
						actions: assign(({ event, context }) => ({
							endDistanceVector: getPointFromEvent(context.startDistanceVector, event),
						})),
						target: ArrayState.EXECUTE_COPY,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: assign(({ event, context }) => ({
							endDistanceVector: getPointFromEvent(context.startDistanceVector, event),
						})),
						target: ArrayState.EXECUTE_COPY,
					},
					MOUSE_CLICK: {
						actions: assign(({ event, context }) => ({
							endDistanceVector: getPointFromEvent(context.startDistanceVector, event),
						})),
						target: ArrayState.EXECUTE_COPY,
					},
					ESC: {
						actions: ArrayAction.INIT_ARRAY_TOOL,
					},
					DRAW: {
						actions: ArrayAction.DRAW_TEMP_DISTANCE_LINE,
					},
				},
			},
			[ArrayState.RADIAL_WAITING_FOR_PIVOT_POINT]: {
				meta: { instructions: 'Click to set pivot point' },
				on: {
					ABSOLUTE_POINT_INPUT: {
						actions: assign(({ event }) => ({
							pivotPoint: (event as AbsolutePointInputEvent).value,
						})),
						target: ArrayState.RADIAL_WAITING_FOR_ANGLE,
					},
					MOUSE_CLICK: {
						actions: assign(({ event }) => ({
							pivotPoint: (event as MouseClickEvent).worldMouseLocation,
						})),
						target: ArrayState.RADIAL_WAITING_FOR_ANGLE,
					},
					ESC: {
						actions: ArrayAction.INIT_ARRAY_TOOL,
					},
				},
			},
			[ArrayState.RADIAL_WAITING_FOR_ANGLE]: {
				meta: { instructions: 'Enter angle per step (in degrees)' },
				on: {
					NUMBER_INPUT: {
						target: ArrayState.EXECUTE_COPY,
						actions: assign(({ event }) => ({
							angleStep: (event as NumberInputEvent).value,
						})),
					},
				},
			},
			[ArrayState.EXECUTE_COPY]: {
				entry: ArrayAction.PERFORM_COPY,
				always: ArrayState.INIT,
			},
		},
	},
	{
		actions: {
			[ArrayAction.INIT_ARRAY_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				setAngleGuideOriginPoint(null);
				return {
					copyMode: null,
					distanceVector: null,
					pivotPoint: null,
					angleStep: null,
					numberOfCopies: 0,
					selectedEntities: [],
				};
			}),

			[ArrayAction.DRAW_TEMP_DISTANCE_LINE]: ({ context, event }) => {
				if (!context.startDistanceVector) {
					throw new Error('[ARRAY] Calling draw temp distance line without a start point');
				}

				const endPointTemp = (event as DrawEvent).drawController.getWorldMouseLocation();

				// Draw the array entities to show the result
				// Draw all selected entities according to distance vector and number of copies, so the user gets visual feedback of where the entities will be copied;
				// TODO

				// // Draw a dashed line between the start move point and the current mouse location
				const activeDistanceLine = new LineEntity(
					getActiveLayerId(),
					context.startDistanceVector,
					endPointTemp
				);
				activeDistanceLine.lineColor = GUIDE_LINE_COLOR;
				activeDistanceLine.lineWidth = GUIDE_LINE_WIDTH;
				activeDistanceLine.lineDash = GUIDE_LINE_STYLE;
				setGhostHelperEntities([activeDistanceLine]);
			},

			[ArrayAction.PERFORM_COPY]: ({ context }) => {
				const resultEntities: Entity[] = [];

				for (let i = 1; i <= context.numberOfCopies; i++) {
					if (
						context.copyMode === 'LINEAR' &&
						context.startDistanceVector &&
						context.endDistanceVector
					) {
						const distanceVector = new Vector(
							context.endDistanceVector.x - context.startDistanceVector.x,
							context.endDistanceVector.y - context.startDistanceVector.y
						);
						const x = distanceVector.x * i;
						const y = distanceVector.y * i;
						resultEntities.push(
							...getSelectedEntities().map((entity) => {
								const clone = entity.clone();
								clone.move(x, y);
								return clone;
							})
						);
					} else if (context.copyMode === 'RADIAL' && context.pivotPoint && context.angleStep) {
						const angleRad = context.angleStep * i * TO_RADIANS;
						resultEntities.push(
							...getSelectedEntities().map((entity) => {
								const clone = entity.clone();
								clone.rotate(context.pivotPoint as Point, angleRad);
								return clone;
							})
						);
					}
				}

				addEntities(resultEntities, true);
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
			},
			[CopyAction.DESELECT_ENTITIES]: assign(() => {
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				return initialArrayContext;
			}),
		},
	}
);
