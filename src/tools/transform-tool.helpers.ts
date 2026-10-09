import { Point } from '@flatten-js/core';
import { assign, createMachine, sendTo } from 'xstate';
import { GUIDE_LINE_COLOR, GUIDE_LINE_STYLE, GUIDE_LINE_WIDTH } from '../App.consts';
import type { Entity } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import {
	addEntities,
	getEditableSelectedEntities,
	getEntities,
	getScreenCanvasDrawController,
	getSnapPoint,
	getSnapPointOnAngleGuide,
	setAngleGuideOriginPoint,
	setDimmedEntityIds,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import type { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool';
import type {
	AbsolutePointInputEvent,
	MouseClickEvent,
	NumberInputEvent,
	RelativePointInputEvent,
	StateEvent,
	ToolContext,
} from './tool.types';

export interface TransformContext extends ToolContext {
	/**
	 * Points the user picked after selecting the entities, eg: the base point of a move
	 */
	points: Point[];
	/**
	 * The selected entities at the moment the user started picking points
	 */
	originalEntities: Entity[];
}

export interface TransformToolConfig {
	tool: Tool;
	/**
	 * Verb used in the instructions, eg: move
	 */
	verb: string;
	/**
	 * Instructions for every point the user has to pick after selecting the entities
	 * While the user picks the last point, a preview of the transformed entities follows the mouse
	 */
	pointInstructions: string[];
	/**
	 * Transform the entities in place, the last point is the mouse location while previewing
	 */
	transform: (entities: Entity[], points: Point[]) => void;
	/**
	 * Add the transformed entities next to the originals instead of replacing them, eg: copy
	 */
	keepOriginals?: boolean;
	/**
	 * Keep picking the last point after the transformation is applied, eg: to place multiple copies
	 */
	repeat?: boolean;
	/**
	 * Convert a number typed by the user into the last point. eg: a distance for move or an angle for rotate
	 */
	numberToPoint?: (value: number, points: Point[], mouseLocation: Point) => Point | null;
	/**
	 * Dashed helper lines drawn while previewing the transformation
	 */
	getGuideEntities?: (points: Point[]) => Entity[];
}

export enum TransformState {
	INIT = 'INIT',
	CHECK_SELECTION = 'CHECK_SELECTION',
	WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
}

export enum TransformAction {
	INIT_TOOL = 'INIT_TOOL',
	CAPTURE_SELECTION = 'CAPTURE_SELECTION',
	ENABLE_HELPERS = 'ENABLE_HELPERS',
	RECORD_POINT = 'RECORD_POINT',
	START_PREVIEW = 'START_PREVIEW',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	APPLY_TRANSFORMATION = 'APPLY_TRANSFORMATION',
	DESELECT_ENTITIES = 'DESELECT_ENTITIES',
}

/**
 * Name of the state where the user picks the point with the given index
 */
export function getPointState(index: number): string {
	return `WAITING_FOR_POINT_${index}`;
}

/**
 * Dashed line used to visualize the points of a transformation
 */
export function createGuideLine(startPoint: Point, endPoint: Point): LineEntity {
	const guideLine = new LineEntity(startPoint, endPoint);
	guideLine.lineColor = GUIDE_LINE_COLOR;
	guideLine.lineWidth = GUIDE_LINE_WIDTH;
	guideLine.lineDash = GUIDE_LINE_STYLE;
	return guideLine;
}

/**
 * Location the mouse would click right now, taking snap points into account
 */
function getSnappedMouseLocation(): Point {
	return (
		getSnapPointOnAngleGuide()?.point ||
		getSnapPoint()?.point ||
		getScreenCanvasDrawController().getWorldMouseLocation()
	);
}

/**
 * Converts the different kinds of point input into a world point
 * Relative points are relative to the last picked point
 */
function getPointFromEvent(
	event: StateEvent,
	context: TransformContext,
	config: TransformToolConfig
): Point | null {
	switch (event.type) {
		case 'MOUSE_CLICK':
			return (event as MouseClickEvent).worldMouseLocation;
		case 'ABSOLUTE_POINT_INPUT':
			return (event as AbsolutePointInputEvent).value;
		case 'RELATIVE_POINT_INPUT': {
			const lastPoint = context.points.at(-1);
			if (!lastPoint) {
				return null;
			}
			const offset = (event as RelativePointInputEvent).value;
			return new Point(lastPoint.x + offset.x, lastPoint.y + offset.y);
		}
		case 'NUMBER_INPUT': {
			const numberEvent = event as NumberInputEvent;
			return (
				config.numberToPoint?.(numberEvent.value, context.points, numberEvent.worldMouseLocation) ??
				null
			);
		}
		default:
			return null;
	}
}

/**
 * Transforms clones of the original entities, the originals stay untouched
 */
export function getTransformedClones(
	originalEntities: Entity[],
	points: Point[],
	transform: TransformToolConfig['transform']
): Entity[] {
	const clones = originalEntities.map((entity) => entity.clone());
	transform(clones, points);
	return clones;
}

/**
 * Replace the original entities with their transformed version, at the same position in the list
 * so the drawing order (eg: fills below lines) is kept
 */
export function replaceEntities(
	entities: Entity[],
	originalEntities: Entity[],
	transformedEntities: Entity[]
): Entity[] {
	const transformedById = new Map<string, Entity>();
	originalEntities.forEach((originalEntity, index) => {
		const transformedEntity = transformedEntities[index];
		// Keep the id, so the entity can still be identified as the same entity
		transformedEntity.id = originalEntity.id;
		transformedById.set(originalEntity.id, transformedEntity);
	});
	return entities.map((entity) => transformedById.get(entity.id) ?? entity);
}

/**
 * Creates a tool that transforms the selection, eg: move, copy, rotate, scale, mirror
 * 1. The user selects entities (or has them selected before activating the tool)
 * 2. The user picks the points of the transformation, eg: base point and target point
 * 3. While picking the last point, the transformed entities are previewed and the originals are dimmed
 * 4. Clicking (or typing a number or a point) applies the transformation
 */
export function createTransformToolStateMachine(config: TransformToolConfig) {
	const pointCount = config.pointInstructions.length;
	const selectToolId = `selectToolInside${config.tool}Tool`;
	const pointInputEvents = ['MOUSE_CLICK', 'ABSOLUTE_POINT_INPUT', 'RELATIVE_POINT_INPUT'] as const;

	// biome-ignore lint/suspicious/noExplicitAny: xstate state configs are generated per point
	const pointStates: Record<string, any> = {};
	config.pointInstructions.forEach((instructions, index) => {
		const isLastPoint = index === pointCount - 1;
		const nextState = isLastPoint
			? config.repeat
				? undefined
				: TransformState.INIT
			: getPointState(index + 1);
		const pointTransition = {
			guard: ({ context, event }: { context: TransformContext; event: StateEvent }) =>
				!!getPointFromEvent(event, context, config),
			actions: isLastPoint ? TransformAction.APPLY_TRANSFORMATION : TransformAction.RECORD_POINT,
			target: nextState,
		};
		const on: Record<string, unknown> = {
			ESC: { actions: TransformAction.DESELECT_ENTITIES, target: TransformState.INIT },
		};
		for (const eventType of pointInputEvents) {
			on[eventType] = pointTransition;
		}
		if (isLastPoint) {
			on.DRAW = { actions: TransformAction.DRAW_PREVIEW };
			if (config.numberToPoint) {
				on.NUMBER_INPUT = pointTransition;
			}
		}
		pointStates[getPointState(index)] = {
			description: instructions,
			meta: { instructions },
			entry: isLastPoint ? TransformAction.START_PREVIEW : TransformAction.ENABLE_HELPERS,
			on,
		};
	});

	return createMachine(
		{
			types: {} as {
				context: TransformContext;
				events: StateEvent;
			},
			context: {
				points: [],
				originalEntities: [],
				type: config.tool,
			},
			initial: TransformState.INIT,
			states: {
				[TransformState.INIT]: {
					description: `Initializing the ${config.verb} tool`,
					always: {
						actions: TransformAction.INIT_TOOL,
						target: TransformState.CHECK_SELECTION,
					},
				},
				[TransformState.CHECK_SELECTION]: {
					description: 'Check if there is something selected',
					always: [
						{
							guard: () => getEditableSelectedEntities().length > 0,
							actions: TransformAction.CAPTURE_SELECTION,
							target: getPointState(0),
						},
						{
							target: TransformState.WAITING_FOR_SELECTION,
						},
					],
				},
				[TransformState.WAITING_FOR_SELECTION]: {
					description: `Select what you want to ${config.verb}`,
					meta: {
						instructions: `Select what you want to ${config.verb}, then ENTER`,
					},
					invoke: {
						id: selectToolId,
						src: selectToolStateMachine,
						onDone: {
							target: TransformState.CHECK_SELECTION,
						},
					},
					on: {
						// Forward the events to the select tool
						MOUSE_CLICK: { actions: sendTo(selectToolId, ({ event }) => event) },
						ENTER: { actions: sendTo(selectToolId, ({ event }) => event) },
						DRAW: { actions: sendTo(selectToolId, ({ event }) => event) },
						ESC: {
							actions: TransformAction.INIT_TOOL,
						},
					},
				},
				...pointStates,
			},
		},
		{
			actions: {
				[TransformAction.INIT_TOOL]: assign(() => {
					setShouldDrawHelpers(false);
					setGhostHelperEntities([]);
					setDimmedEntityIds([]);
					setAngleGuideOriginPoint(null);
					return {
						points: [],
						originalEntities: [],
					};
				}),
				[TransformAction.CAPTURE_SELECTION]: assign(() => {
					const originalEntities = getEditableSelectedEntities();
					// Show the captured entities faded instead of selected,
					// so ESC goes straight to the tool instead of only clearing the selection
					setSelectedEntityIds([]);
					setDimmedEntityIds(originalEntities.map((entity) => entity.id));
					return {
						points: [],
						originalEntities,
					};
				}),
				[TransformAction.DESELECT_ENTITIES]: () => {
					setSelectedEntityIds([]);
				},
				[TransformAction.ENABLE_HELPERS]: () => {
					setShouldDrawHelpers(true);
				},
				[TransformAction.RECORD_POINT]: assign(({ context, event }) => {
					const point = getPointFromEvent(event, context, config);
					if (!point) {
						return {};
					}
					if (!context.points.length) {
						// Angle guides start from the first point, eg: the base point of a move or the origin of a rotation
						setAngleGuideOriginPoint(point);
					}
					return {
						points: [...context.points, point],
					};
				}),
				[TransformAction.START_PREVIEW]: ({ context }) => {
					setShouldDrawHelpers(true);
					// Keep the originals in the drawing, so they can still be used for snapping, but draw them faded
					setDimmedEntityIds(context.originalEntities.map((entity) => entity.id));
					setSelectedEntityIds([]);
				},
				[TransformAction.DRAW_PREVIEW]: ({ context }) => {
					const points = [...context.points, getSnappedMouseLocation()];
					setGhostHelperEntities([
						...(config.getGuideEntities?.(points) ?? []),
						...getTransformedClones(context.originalEntities, points, config.transform),
					]);
				},
				[TransformAction.APPLY_TRANSFORMATION]: ({ context, event }) => {
					const point = getPointFromEvent(event, context, config);
					if (!point) {
						return;
					}
					const transformedEntities = getTransformedClones(
						context.originalEntities,
						[...context.points, point],
						config.transform
					);
					if (config.keepOriginals) {
						addEntities(transformedEntities, true);
					} else {
						setEntities(
							replaceEntities(getEntities(), context.originalEntities, transformedEntities),
							true
						);
					}
					setGhostHelperEntities([]);
				},
			},
		}
	);
}
