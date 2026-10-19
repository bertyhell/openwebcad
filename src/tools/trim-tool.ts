import type { Point, Polygon } from '@flatten-js/core';
import { assign, createMachine } from 'xstate';
import type { ArcEntity } from '../entities/ArcEntity';
import type { CircleEntity } from '../entities/CircleEntity';
import { EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import type { RectangleEntity } from '../entities/RectangleEntity';
import { findClosestEntity } from '../helpers/find-closest-entity';
import { polygonToSegments } from '../helpers/polygon-to-segments';
import {
	addEntities,
	deleteEntities,
	getEditableEntities,
	getEntities,
	getVisibleEntities,
	setEntities,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { MouseClickEvent, StateEvent, ToolContext } from './tool.types';
import {
	eraseArcSegment,
	eraseCircleSegment,
	eraseLineSegment,
	getAllIntersectionPoints,
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
					// TODO implement a DRAW action to draw the segment that will be erased in dotted line
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
				setGhostHelperEntities([]);
				return {};
			}),
			[TrimAction.HANDLE_MOUSE_CLICK]: assign(({ context, event }) => {
				handleMouseClick((event as MouseClickEvent).worldMouseLocation);

				return context;
			}),
		},
	}
);

export function handleMouseClick(worldMouseLocation: Point) {
	const closestEntity = findClosestEntity(worldMouseLocation, getEditableEntities());
	if (!closestEntity) {
		return;
	}

	const clickedPointOnShape = closestEntity.segment.start;

	// Find entities that intersect with the closest entity
	const intersections = getAllIntersectionPoints(closestEntity.entity, getVisibleEntities());

	const entityType = closestEntity.entity.getType();
	switch (entityType) {
		case EntityName.Line: {
			const line = closestEntity.entity as LineEntity;
			eraseLineSegment(line, clickedPointOnShape, intersections);
			break;
		}

		case EntityName.Circle: {
			const circle = closestEntity.entity as CircleEntity;
			eraseCircleSegment(circle, clickedPointOnShape, intersections);
			break;
		}

		case EntityName.Arc: {
			const arc = closestEntity.entity as ArcEntity;
			eraseArcSegment(arc, clickedPointOnShape, intersections);
			break;
		}

		case EntityName.Rectangle: {
			const rectangle = closestEntity.entity as RectangleEntity;
			const segments = polygonToSegments(rectangle.getShape() as Polygon);
			const segmentEntities = segments.map((segment) => new LineEntity(segment));

			// Find the closest segment to the clicked point
			const closestSegmentInfo = findClosestEntity(worldMouseLocation, segmentEntities);

			// Remove the rectangle
			deleteEntities([rectangle], false);

			// Add 4 lines instead of the rectangle
			addEntities(segmentEntities, false);

			// Remove (a segment) of the 4th line closest to the cursor
			const lineIntersections = getAllIntersectionPoints(
				closestSegmentInfo.entity,
				getVisibleEntities()
			);
			eraseLineSegment(
				closestSegmentInfo.entity as LineEntity,
				clickedPointOnShape,
				lineIntersections
			);
			break;
		}

		case EntityName.Image: {
			// TODO implement image eraser
			// Switch to rectangle entity and delete the image and the line that was closest to the cursor
		}
	}

	setEntities(getEntities(), true); // Force a new undo state entry
}
