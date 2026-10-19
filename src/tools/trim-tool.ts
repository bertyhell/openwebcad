import type { Point, Polygon } from '@flatten-js/core';
import { assign, createMachine } from 'xstate';
import { CURSOR_SIZE } from '../App.consts';
import type { ArcEntity } from '../entities/ArcEntity';
import type { CircleEntity } from '../entities/CircleEntity';
import { EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import type { RectangleEntity } from '../entities/RectangleEntity';
import { findClosestEntity } from '../helpers/find-closest-entity';
import { polygonToSegments } from '../helpers/polygon-to-segments';
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
 * Calculates which part of the entity under the mouse would be removed by the trim tool
 * Returns null when no editable entity is within the cursor size of the mouse
 * @param worldMouseLocation the mouse location in world coordinates
 * @param maxDistance the max distance in world units between the mouse and the entity
 */
export function getTrimResult(
	worldMouseLocation: Point,
	maxDistance: number = getMaxTrimDistance()
): TrimResult | null {
	const editableEntities = getEditableEntities();
	if (!editableEntities.length) {
		return null;
	}
	const closestEntity = findClosestEntity(worldMouseLocation, editableEntities);
	if (!closestEntity.entity || closestEntity.distance > maxDistance) {
		return null;
	}

	const clickedPointOnShape = closestEntity.segment.start;

	// Find entities that intersect with the closest entity
	const intersections = getAllIntersectionPoints(closestEntity.entity, getVisibleEntities());

	const entityType = closestEntity.entity.getType();
	switch (entityType) {
		case EntityName.Line:
			return trimLineSegment(
				closestEntity.entity as LineEntity,
				clickedPointOnShape,
				intersections
			);

		case EntityName.Circle:
			return trimCircleSegment(
				closestEntity.entity as CircleEntity,
				clickedPointOnShape,
				intersections
			);

		case EntityName.Arc:
			return trimArcSegment(closestEntity.entity as ArcEntity, clickedPointOnShape, intersections);

		case EntityName.Rectangle: {
			const rectangle = closestEntity.entity as RectangleEntity;
			const segments = polygonToSegments(rectangle.getShape() as Polygon);
			const segmentEntities = segments.map((segment) =>
				Object.assign(new LineEntity(segment), {
					lineColor: rectangle.lineColor,
					lineWidth: rectangle.lineWidth,
				})
			);

			// Find the closest segment to the clicked point
			const closestSegment = findClosestEntity<LineEntity>(
				worldMouseLocation,
				segmentEntities
			).entity;
			const otherSegments = segmentEntities.filter((segment) => segment !== closestSegment);

			// The rectangle is replaced by its 4 lines, so intersect with those instead of with the rectangle
			const lineIntersections = getAllIntersectionPoints(closestSegment, [
				...getVisibleEntities().filter((entity) => entity.id !== rectangle.id),
				...otherSegments,
			]);
			const lineTrimResult = trimLineSegment(
				closestSegment,
				clickedPointOnShape,
				lineIntersections
			);

			// Replace the rectangle by 4 lines and remove (a segment) of the line closest to the cursor
			return {
				original: [rectangle],
				remaining: [...otherSegments, ...lineTrimResult.remaining],
				removed: lineTrimResult.removed,
			};
		}

		case EntityName.Image:
			// TODO implement image eraser
			// Switch to rectangle entity and delete the image and the line that was closest to the cursor
			return null;
	}

	return null;
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

	// Dim the original entity and draw the parts that will be removed in a dashed line on top
	const removedEntities = trimResult.removed.map((entity) => {
		const preview = entity.clone();
		preview.lineDash = [4, 4];
		return preview;
	});
	setDimmedEntityIds(trimResult.original.map((entity) => entity.id));
	setGhostHelperEntities([...trimResult.remaining, ...removedEntities]);
}

export function handleMouseClick(worldMouseLocation: Point, maxDistance?: number) {
	const trimResult = getTrimResult(worldMouseLocation, maxDistance);
	if (!trimResult) {
		return;
	}

	applyTrimResult(trimResult);
	setDimmedEntityIds([]);
	setGhostHelperEntities([]);

	setEntities(getEntities(), true); // Force a new undo state entry
}
