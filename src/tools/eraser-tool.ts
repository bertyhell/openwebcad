import { Box, Point, Segment } from '@flatten-js/core';
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
import { isPointEqual } from '../helpers/is-point-equal.ts';

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
      
      // Find the closest segment to the clicked point
      const closestSegment = findClosestEntity(worldClickPoint, segments.map(segment => new LineEntity(segment)));
      
      if (closestSegment) {
        // Remove the rectangle
        deleteEntity(rectangle);
        
        // Create line entities for all sides
        segments.forEach(segment => {
          const segmentIntersections = intersections.filter(point => segment.contains(point));
          
          if (segmentIntersections.length > 0) {
            // If the segment has intersections, split it
            const sortedPoints = [segment.start, ...segmentIntersections, segment.end]
              .sort((a, b) => a.distanceTo(segment.start)[0] - b.distanceTo(segment.start)[0]);
            
            for (let i = 0; i < sortedPoints.length - 1; i++) {
              const subSegment = new Segment(sortedPoints[i], sortedPoints[i + 1]);
              if (!isPointOnSegment(worldClickPoint, subSegment)) {
                const lineEntity = new LineEntity(subSegment);
                lineEntity.lineColor = rectangle.lineColor;
                lineEntity.lineWidth = rectangle.lineWidth;
                addEntity(lineEntity);
              }
            }
          } else if (!areLineSegmentsEqual(segment, (closestSegment.entity as LineEntity).getShape() as Segment)) {
            // If the segment is not the clicked one and has no intersections, add it as is
            const lineEntity = new LineEntity(segment);
            lineEntity.lineColor = rectangle.lineColor;
            lineEntity.lineWidth = rectangle.lineWidth;
            addEntity(lineEntity);
          }
        });
      }
      break;
    }
  }
}

function isPointOnSegment(point: Point, segment: Segment): boolean {
  const distance = point.distanceTo(segment)[0];
  return distance < 0.001; // You may need to adjust this threshold
}

function areLineSegmentsEqual(segment1: Segment, segment2: Segment): boolean {
  return (
    (isPointEqual(segment1.start, segment2.start) && isPointEqual(segment1.end, segment2.end)) ||
    (isPointEqual(segment1.start, segment2.end) && isPointEqual(segment1.end, segment2.start))
  );
}