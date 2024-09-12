import { Box, Point } from '@flatten-js/core';
import { findClosestEntity } from '../helpers/find-closest-entity.ts';
import {
  addEntity,
  deleteEntity,
  getEntities,
  setActiveEntity,
  setActiveTool,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { EntityName } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { DrawEvent, KeyboardEscEvent, MouseClickEvent } from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';
import {
  eraseArcSegment,
  eraseCircleSegment,
  eraseLineSegment,
  getAllIntersectionPoints,
} from './eraser-tool.helpers.ts';

export interface EraserContext {}

export enum EraserState {
  WAITING_FOR_FIRST_CLICK = 'WAITING_FOR_FIRST_CLICK',
}

export enum EraserAction {
  INIT_ERASER_TOOL = 'INIT_ERASER_TOOL',
  HANDLE_MOUSE_CLICK = 'HANDLE_MOUSE_CLICK',
}

const eraserToolStateMachine = createMachine(
  {
    types: {} as {
      context: EraserContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      startPoint: null,
    },
    initial: EraserState.WAITING_FOR_FIRST_CLICK,
    states: {
      [EraserState.WAITING_FOR_FIRST_CLICK]: {
        always: {
          actions: EraserAction.INIT_ERASER_TOOL,
        },
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
      [EraserAction.INIT_ERASER_TOOL]: () => {
        console.log('activate eraser tool');
        setActiveTool(Tool.Eraser);
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
      },
      [EraserAction.HANDLE_MOUSE_CLICK]: assign((context, event) => {
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

export const eraserToolActor = createActor(eraserToolStateMachine);
eraserToolActor.subscribe(state => {
  console.log('eraser tool state:', state.value);
});
