import { Point, Polygon } from '@flatten-js/core';
import { findClosestEntity } from '../helpers/find-closest-entity';
import {
  addEntities,
  deleteEntities,
  getEntities,
  setEntities,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import { EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { CircleEntity } from '../entities/CircleEntity';
import { RectangleEntity } from '../entities/RectangleEntity';
import { ArcEntity } from '../entities/ArcEntity';
import { MouseClickEvent, StateEvent, ToolContext } from './tool.types';
import { Tool } from '../tools';
import { assign, createMachine } from 'xstate';
import {
  eraseArcSegment,
  eraseCircleSegment,
  eraseLineSegment,
  getAllIntersectionPoints,
} from './eraser-tool.helpers';
import { polygonToSegments } from '../helpers/polygon-to-segments';

export interface EraserContext extends ToolContext {
  startPoint: Point | null;
}

export enum EraserState {
  INIT = 'INIT',
  WAITING_FOR_FIRST_CLICK = 'WAITING_FOR_FIRST_CLICK',
}

export enum EraserAction {
  INIT_ERASER_TOOL = 'INIT_ERASER_TOOL',
  HANDLE_MOUSE_CLICK = 'HANDLE_MOUSE_CLICK',
}

export const eraserToolStateMachine = createMachine(
  {
    types: {} as {
      context: EraserContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      type: Tool.ERASER,
    },
    initial: EraserState.INIT,
    states: {
      [EraserState.INIT]: {
        description: 'Initializing the eraser tool',
        always: {
          actions: EraserAction.INIT_ERASER_TOOL,
          target: EraserState.WAITING_FOR_FIRST_CLICK,
        },
      },
      [EraserState.WAITING_FOR_FIRST_CLICK]: {
        description: 'Select a line segment to delete',
        meta: {
          instructions: 'Select a line segment to delete',
        },
        on: {
          // TODO implement a DRAW action to draw the segment that will be erased in dotted line
          MOUSE_CLICK: {
            actions: EraserAction.HANDLE_MOUSE_CLICK,
            target: EraserState.WAITING_FOR_FIRST_CLICK,
          },
        },
      },
      // TODO implement rectangle selection to delete
    },
  },
  {
    actions: {
      [EraserAction.INIT_ERASER_TOOL]: assign(() => {
        setShouldDrawHelpers(false);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        return {};
      }),
      [EraserAction.HANDLE_MOUSE_CLICK]: assign(({ context, event }) => {
        handleMouseClick((event as MouseClickEvent).worldMouseLocation);

        return context;
      }),
    },
  },
);

function handleMouseClick(worldMouseLocation: Point) {
  const closestEntity = findClosestEntity(worldMouseLocation, getEntities());
  if (!closestEntity) {
    return;
  }

  const clickedPointOnShape = closestEntity.segment.start;

  // Find entities that intersect with the closest entity
  const intersections = getAllIntersectionPoints(
    closestEntity.entity,
    getEntities(),
  );

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
      const segmentEntities = segments.map(segment => new LineEntity(segment));

      // Find the closest segment to the clicked point
      const closestSegmentInfo = findClosestEntity(
        worldMouseLocation,
        segmentEntities,
      );

      // Remove the rectangle
      deleteEntities([rectangle], false);

      // Add 4 lines instead of the rectangle
      addEntities(segmentEntities, false);

      // Remove (a segment) of the 4th line closest to the cursor
      const lineIntersections = getAllIntersectionPoints(
        closestSegmentInfo.entity,
        getEntities(),
      );
      eraseLineSegment(
        closestSegmentInfo.entity as LineEntity,
        clickedPointOnShape,
        lineIntersections,
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
