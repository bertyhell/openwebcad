import { Box, Point } from '@flatten-js/core';
import { findClosestEntity } from '../helpers/find-closest-entity.ts';
import {
  addEntity,
  deleteEntity,
  getEntities,
  setActiveEntity,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { EntityName } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { MouseClickEvent, StateEvent, ToolContext } from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createMachine } from 'xstate';
import {
  eraseArcSegment,
  eraseCircleSegment,
  eraseLineSegment,
  getAllIntersectionPoints,
} from './eraser-tool.helpers.ts';

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
        on: {
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
        console.log('activate eraser tool');
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {};
      }),
      [EraserAction.HANDLE_MOUSE_CLICK]: assign(({ context, event }) => {
        handleMouseClick((event as MouseClickEvent).worldClickPoint);

        return context;
      }),
    },
  },
);

function handleMouseClick(worldClickPoint: Point) {
  const closestEntity = findClosestEntity(worldClickPoint, getEntities());
  if (!closestEntity) {
    return;
  }

  const clickedPointOnShape = closestEntity.segment.start;

  // Find entities that intersect with the closest entity
  const intersections = getAllIntersectionPoints(
    closestEntity.entity,
    getEntities(),
  );

  switch (closestEntity.entity.getType()) {
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
      const rectangleShape = rectangle.getShape() as Box;
      const segments = rectangleShape.toSegments();
      const segmentEntities = segments.map(segment => new LineEntity(segment));
      // Replace rectangle with its line segments in the entities array
      deleteEntity(rectangle);
      addEntity(...segmentEntities);

      segmentEntities.forEach(segmentEntity =>
        eraseLineSegment(segmentEntity, clickedPointOnShape, intersections),
      );
      break;
    }
  }
}
