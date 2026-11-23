import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { CURSOR_SIZE, HIGHLIGHT_LINE_STYLE } from '../App.consts';
import type { ArcEntity } from '../entities/ArcEntity';
import type { CircleEntity } from '../entities/CircleEntity';
import { EntityName } from '../entities/Entity';
import type { LineEntity } from '../entities/LineEntity';
import { findClosestEntity } from '../helpers/find-closest-entity';
import {
	getEditableEntities,
	getEntities,
	getScreenCanvasDrawController,
	getVisibleEntities,
	setDimmedEntityIds,
	setEntities,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { DrawEvent, MouseClickEvent, StateEvent, ToolContext } from './tool.types';
import {
	applyTrimResult,
	getAllIntersectionPoints,
	type TrimResult,
	trimArcSegment,
	trimCircleSegment,
	trimLineSegment,
	trimPathSegment,
} from './trim-tool.helpers';

export interface TrimContext extends ToolContext {
	startPoint: Point | null;
}

export enum TrimState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_CLICK = 'WAITING_FOR_FIRST_CLICK',
}

export enum TrimAction {
	INIT_TRIM_TOOL = 'INIT_TRIM_TOOL',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	HANDLE_MOUSE_CLICK = 'HANDLE_MOUSE_CLICK',
}

export const trimToolStateMachine = createMachine(
	{
		types: {} as {
			context: TrimContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			type: Tool.TRIM,
		},
		initial: TrimState.INIT,
		states: {
			[TrimState.INIT]: {
				description: 'Initializing the trim tool',
				always: {
					actions: TrimAction.INIT_TRIM_TOOL,
					target: TrimState.WAITING_FOR_FIRST_CLICK,
				},
			},
			[TrimState.WAITING_FOR_FIRST_CLICK]: {
				description: 'Select a line segment to delete',
				meta: {
					instructions: 'Select a line segment to delete',
				},
				on: {
					DRAW: { actions: TrimAction.DRAW_PREVIEW },
					MOUSE_CLICK: {
						actions: TrimAction.HANDLE_MOUSE_CLICK,
						target: TrimState.WAITING_FOR_FIRST_CLICK,
					},
				},
			},
			// TODO implement rectangle selection to delete
		},
	},
	{
		actions: {
			[TrimAction.INIT_TRIM_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setDimmedEntityIds([]);
				setGhostHelperEntities([]);
				return {};
			}),
			[TrimAction.DRAW_PREVIEW]: ({ event }) => {
				drawTrimPreview((event as DrawEvent).drawController.getWorldMouseLocation());
			},
			[TrimAction.HANDLE_MOUSE_CLICK]: assign(({ context, event }) => {
				handleMouseClick((event as MouseClickEvent).worldMouseLocation);

				return context;
			}),
		},
	}
);

/**
 * Either the parts that a trim would remove and keep, or the reason why the entity under the mouse can't be trimmed
 */
type TrimOutcome = { trimResult: TrimResult } | { message: string };

/**
 * Calculates what trimming the entity under the mouse would do
 * Returns null when no editable entity is within the cursor size of the mouse
 * @param worldMouseLocation the mouse location in world coordinates
 * @param maxDistance the max distance in world units between the mouse and the entity
 */
function getTrimOutcome(worldMouseLocation: Point, maxDistance: number): TrimOutcome | null {
	const editableEntities = getEditableEntities();
	if (!editableEntities.length) {
		return null;
	}
	const closestEntity = findClosestEntity(worldMouseLocation, editableEntities);
	if (!closestEntity.entity || closestEntity.distance > maxDistance) {
		return null;
	}

	const entity = closestEntity.entity;
	const clickedPointOnShape = closestEntity.segment.start;

	const entityType = entity.getType();
	switch (entityType) {
		case EntityName.Line:
			return {
				trimResult: trimLineSegment(
					entity as LineEntity,
					clickedPointOnShape,
					getAllIntersectionPoints(entity, getVisibleEntities())
				),
			};

		case EntityName.Circle: {
			const trimResult = trimCircleSegment(
				entity as CircleEntity,
				clickedPointOnShape,
				getAllIntersectionPoints(entity, getVisibleEntities())
			);
			return trimResult
				? { trimResult }
				: { message: 'A circle can only be trimmed where it crosses other entities at two points' };
		}

		case EntityName.Arc:
			return {
				trimResult: trimArcSegment(
					entity as ArcEntity,
					clickedPointOnShape,
					getAllIntersectionPoints(entity, getVisibleEntities())
				),
			};

		case EntityName.Rectangle:
		case EntityName.PolyLine: {
			// Only the clicked segment is trimmed, the rest of the rectangle or polyline is kept as one or two polylines
			const trimResult = trimPathSegment(entity, clickedPointOnShape, getVisibleEntities());
			return trimResult ? { trimResult } : null;
		}

		default:
			return { message: `Trim is not supported for ${entityType.toLowerCase()}` };
	}
}

/**
 * Calculates which part of the entity under the mouse would be removed by the trim tool
 * Returns null when no editable entity is within the cursor size of the mouse or when it can't be trimmed
 * @param worldMouseLocation the mouse location in world coordinates
 * @param maxDistance the max distance in world units between the mouse and the entity
 */
export function getTrimResult(
	worldMouseLocation: Point,
	maxDistance: number = getMaxTrimDistance()
): TrimResult | null {
	const trimOutcome = getTrimOutcome(worldMouseLocation, maxDistance);
	return trimOutcome && 'trimResult' in trimOutcome ? trimOutcome.trimResult : null;
}

/**
 * The trim tool only works on entities within the cursor size of the mouse
 * The cursor size is in screen pixels, so convert it to world units
 */
function getMaxTrimDistance(): number {
	return CURSOR_SIZE / getScreenCanvasDrawController().getScreenScale();
}

function drawTrimPreview(worldMouseLocation: Point): void {
	const trimResult = getTrimResult(worldMouseLocation);
	if (!trimResult) {
		setDimmedEntityIds([]);
		setGhostHelperEntities([]);
		return;
	}

	// Dim the original entity and draw the parts that will be removed in the highlight dash on top
	const removedEntities = trimResult.removed.map((entity) => {
		const preview = entity.clone();
		preview.lineDash = HIGHLIGHT_LINE_STYLE;
		return preview;
	});
	setDimmedEntityIds(trimResult.original.map((entity) => entity.id));
	setGhostHelperEntities([...trimResult.remaining, ...removedEntities]);
}

export function handleMouseClick(
	worldMouseLocation: Point,
	maxDistance: number = getMaxTrimDistance()
) {
	const trimOutcome = getTrimOutcome(worldMouseLocation, maxDistance);
	if (!trimOutcome) {
		return;
	}
	if ('message' in trimOutcome) {
		// Only explain on click, the preview runs on every mouse move
		toast.info(trimOutcome.message);
		return;
	}

	applyTrimResult(trimOutcome.trimResult);
	setDimmedEntityIds([]);
	setGhostHelperEntities([]);

	setEntities(getEntities(), true); // Force a new undo state entry
}
