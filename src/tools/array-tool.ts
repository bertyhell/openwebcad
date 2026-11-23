import { type Point, Vector } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine, sendTo } from 'xstate';
import { GUIDE_LINE_COLOR, GUIDE_LINE_STYLE, GUIDE_LINE_WIDTH, TO_RADIANS } from '../App.consts.ts';
import type { Entity } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import {
	addEntities,
	getEditableSelectedEntities,
	setAngleGuideOriginPoint,
	setDimmedEntityIds,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type {
	DrawEvent,
	NumberInputEvent,
	PointInputEvent,
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
	CAPTURE_SELECTION = 'CAPTURE_SELECTION',
	DIM_ORIGINAL_ENTITIES = 'DIM_ORIGINAL_ENTITIES',
	RECORD_COPY_MODE = 'RECORD_COPY_MODE',
	RECORD_NUMBER_OF_COPIES = 'RECORD_NUMBER_OF_COPIES',
	RECORD_START_POINT = 'RECORD_START_POINT',
	RECORD_END_POINT = 'RECORD_END_POINT',
	RECORD_PIVOT_POINT = 'RECORD_PIVOT_POINT',
	RECORD_ANGLE_STEP = 'RECORD_ANGLE_STEP',
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
	/**
	 * The editable entities that were selected when the user started the array
	 */
	originalEntities: Entity[];
}

enum CopyMode {
	LINEAR = 'LINEAR',
	RADIAL = 'RADIAL',
}

const LINEAR_OPTION = 'L';
const RADIAL_OPTION = 'R';
const MAX_NUMBER_OF_COPIES = 10000;

const initialArrayContext: ArrayContext = {
	copyMode: null,
	startDistanceVector: null,
	endDistanceVector: null,
	pivotPoint: null,
	angleStep: null,
	numberOfCopies: 0,
	originalEntities: [],
	type: Tool.ARRAY,
};

function getCopyMode(event: StateEvent): CopyMode | null {
	const option = (event as TextInputEvent).value.trim().toUpperCase();
	if (option === LINEAR_OPTION) return CopyMode.LINEAR;
	if (option === RADIAL_OPTION) return CopyMode.RADIAL;
	return null;
}

function isValidNumberOfCopies(event: StateEvent): boolean {
	const value = (event as NumberInputEvent).value;
	return Number.isInteger(value) && value >= 1 && value <= MAX_NUMBER_OF_COPIES;
}

/**
 * The end point has to differ from the start point, otherwise every copy lands on top of the originals
 */
function isValidEndPoint(context: ArrayContext, event: StateEvent): boolean {
	return (
		!!context.startDistanceVector &&
		!isPointEqual(
			context.startDistanceVector,
			getPointFromEvent(context.startDistanceVector, event as PointInputEvent)
		)
	);
}

const recordStartPointTransition = {
	actions: ArrayAction.RECORD_START_POINT,
	target: ArrayState.LINEAR_WAITING_FOR_END_POINT,
};

const recordEndPointTransitions = [
	{
		guard: ({ context, event }: { context: ArrayContext; event: StateEvent }) =>
			isValidEndPoint(context, event),
		actions: ArrayAction.RECORD_END_POINT,
		target: ArrayState.EXECUTE_COPY,
	},
	{
		actions: () => {
			toast.info('The end point has to be different from the start point');
		},
	},
];

const recordPivotPointTransition = {
	actions: ArrayAction.RECORD_PIVOT_POINT,
	target: ArrayState.RADIAL_WAITING_FOR_ANGLE,
};

/**
 * Stop the array and go back to selecting what to copy
 */
const escTransition = {
	actions: ArrayAction.DESELECT_ENTITIES,
	target: ArrayState.INIT,
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
					actions: ArrayAction.INIT_ARRAY_TOOL,
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
						guard: () => getEditableSelectedEntities().length > 0,
						actions: [ArrayAction.CAPTURE_SELECTION, ArrayAction.DIM_ORIGINAL_ENTITIES],
						target: ArrayState.ASK_COPY_MODE,
					},
					{
						target: ArrayState.WAITING_FOR_SELECTION,
					},
				],
			},
			[ArrayState.ASK_COPY_MODE]: {
				meta: { instructions: 'Choose copy mode: Linear (L) or Radial (R), ENTER for Linear' },
				on: {
					TEXT_INPUT: [
						{
							guard: ({ event }) => !!getCopyMode(event),
							actions: ArrayAction.RECORD_COPY_MODE,
							target: ArrayState.ASK_NUMBER_OF_COPIES,
						},
						{
							actions: () => {
								toast.info('Type L for a linear array or R for a radial array');
							},
						},
					],
					ENTER: {
						actions: assign(() => ({
							copyMode: CopyMode.LINEAR,
						})),
						target: ArrayState.ASK_NUMBER_OF_COPIES,
					},
					ESC: escTransition,
				},
			},
			[ArrayState.ASK_NUMBER_OF_COPIES]: {
				meta: { instructions: 'Enter number of copies' },
				on: {
					NUMBER_INPUT: [
						{
							guard: ({ context, event }) =>
								isValidNumberOfCopies(event) && context.copyMode === CopyMode.LINEAR,
							actions: ArrayAction.RECORD_NUMBER_OF_COPIES,
							target: ArrayState.LINEAR_WAITING_FOR_START_POINT,
						},
						{
							guard: ({ context, event }) =>
								isValidNumberOfCopies(event) && context.copyMode === CopyMode.RADIAL,
							actions: ArrayAction.RECORD_NUMBER_OF_COPIES,
							target: ArrayState.RADIAL_WAITING_FOR_PIVOT_POINT,
						},
						{
							actions: () => {
								toast.info(
									`The number of copies has to be a whole number from 1 to ${MAX_NUMBER_OF_COPIES}`
								);
							},
						},
					],
					ESC: escTransition,
				},
			},
			[ArrayState.LINEAR_WAITING_FOR_START_POINT]: {
				meta: { instructions: 'Click to define the start of the distance vector' },
				on: {
					ABSOLUTE_POINT_INPUT: recordStartPointTransition,
					MOUSE_CLICK: recordStartPointTransition,
					ESC: escTransition,
				},
			},
			[ArrayState.LINEAR_WAITING_FOR_END_POINT]: {
				meta: {
					instructions: 'Click to define the end of the distance vector, or type the distance',
				},
				on: {
					RELATIVE_POINT_INPUT: recordEndPointTransitions,
					ABSOLUTE_POINT_INPUT: recordEndPointTransitions,
					MOUSE_CLICK: recordEndPointTransitions,
					NUMBER_INPUT: recordEndPointTransitions,
					ESC: escTransition,
					DRAW: {
						actions: ArrayAction.DRAW_TEMP_DISTANCE_LINE,
					},
				},
			},
			[ArrayState.RADIAL_WAITING_FOR_PIVOT_POINT]: {
				meta: { instructions: 'Click to set pivot point' },
				on: {
					ABSOLUTE_POINT_INPUT: recordPivotPointTransition,
					MOUSE_CLICK: recordPivotPointTransition,
					ESC: escTransition,
				},
			},
			[ArrayState.RADIAL_WAITING_FOR_ANGLE]: {
				meta: { instructions: 'Enter angle per step (in degrees)' },
				on: {
					NUMBER_INPUT: [
						{
							// An angle of 0 puts every copy on top of the originals
							guard: ({ event }) => (event as NumberInputEvent).value !== 0,
							actions: ArrayAction.RECORD_ANGLE_STEP,
							target: ArrayState.EXECUTE_COPY,
						},
						{
							actions: () => {
								toast.info('The angle per step can not be 0');
							},
						},
					],
					ESC: escTransition,
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
			// Doesn't touch the selection, so a selection made before starting the tool is used
			[ArrayAction.INIT_ARRAY_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setGhostHelperEntities([]);
				setDimmedEntityIds([]);
				setAngleGuideOriginPoint(null);
				return {
					copyMode: null,
					startDistanceVector: null,
					endDistanceVector: null,
					pivotPoint: null,
					angleStep: null,
					numberOfCopies: 0,
					originalEntities: [],
				};
			}),
			[ArrayAction.CAPTURE_SELECTION]: assign(() => {
				// Entities on hidden or locked layers are not copied
				const originalEntities = getEditableSelectedEntities();
				setSelectedEntityIds([]);
				return { originalEntities };
			}),
			// Not part of the assign above: assign runs while the actor is created, before setActiveToolActor clears the dimmed entities
			[ArrayAction.DIM_ORIGINAL_ENTITIES]: ({ context }) => {
				// Show the captured entities faded instead of selected,
				// so ESC goes straight to the tool instead of only clearing the selection
				setDimmedEntityIds(context.originalEntities.map((entity) => entity.id));
			},
			[ArrayAction.RECORD_COPY_MODE]: assign(({ event }) => ({
				copyMode: getCopyMode(event),
			})),
			[ArrayAction.RECORD_NUMBER_OF_COPIES]: assign(({ event }) => ({
				numberOfCopies: (event as NumberInputEvent).value,
			})),
			[ArrayAction.RECORD_START_POINT]: assign(({ event }) => {
				const startDistanceVector = getPointFromEvent(null, event as PointInputEvent);
				setAngleGuideOriginPoint(startDistanceVector);
				return { startDistanceVector };
			}),
			[ArrayAction.RECORD_END_POINT]: assign(({ context, event }) => ({
				endDistanceVector: getPointFromEvent(context.startDistanceVector, event as PointInputEvent),
			})),
			[ArrayAction.RECORD_PIVOT_POINT]: assign(({ event }) => ({
				pivotPoint: getPointFromEvent(null, event as PointInputEvent),
			})),
			[ArrayAction.RECORD_ANGLE_STEP]: assign(({ event }) => ({
				angleStep: (event as NumberInputEvent).value,
			})),

			[ArrayAction.DRAW_TEMP_DISTANCE_LINE]: ({ context, event }) => {
				if (!context.startDistanceVector) {
					throw new Error('[ARRAY] Calling draw temp distance line without a start point');
				}

				const endPointTemp = (event as DrawEvent).drawController.getWorldMouseLocation();

				// Draw the array entities to show the result
				// Draw all selected entities according to distance vector and number of copies, so the user gets visual feedback of where the entities will be copied;
				// TODO

				// // Draw a dashed line between the start move point and the current mouse location
				const activeDistanceLine = new LineEntity(context.startDistanceVector, endPointTemp);
				activeDistanceLine.lineColor = GUIDE_LINE_COLOR;
				activeDistanceLine.lineWidth = GUIDE_LINE_WIDTH;
				activeDistanceLine.lineDash = GUIDE_LINE_STYLE;
				setGhostHelperEntities([activeDistanceLine]);
			},

			[ArrayAction.PERFORM_COPY]: ({ context }) => {
				const resultEntities: Entity[] = [];

				for (let i = 1; i <= context.numberOfCopies; i++) {
					if (
						context.copyMode === CopyMode.LINEAR &&
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
							...context.originalEntities.map((entity) => {
								const clone = entity.clone();
								clone.move(x, y);
								return clone;
							})
						);
					} else if (
						context.copyMode === CopyMode.RADIAL &&
						context.pivotPoint &&
						context.angleStep
					) {
						const angleRad = context.angleStep * i * TO_RADIANS;
						resultEntities.push(
							...context.originalEntities.map((entity) => {
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
			[ArrayAction.DESELECT_ENTITIES]: assign(() => {
				setGhostHelperEntities([]);
				setSelectedEntityIds([]);
				setDimmedEntityIds([]);
				return initialArrayContext;
			}),
		},
	}
);
