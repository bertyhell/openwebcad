import { CircleEntity } from '../entities/CircleEntity';
import { Point } from '@flatten-js/core';
import {
  addEntities,
  getActiveLineColor,
  getActiveLineWidth,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import {
  DrawEvent,
  PointInputEvent,
  StateEvent,
  ToolContext,
} from './tool.types';
import { Tool } from '../tools';
import { assign, createMachine } from 'xstate';
import { pointDistance } from '../helpers/distance-between-points';
import { LineState } from './line-tool.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';

export interface CircleContext extends ToolContext {
  centerPoint: Point | null;
}

export enum CircleState {
  WAITING_FOR_CENTER_POINT = 'WAITING_FOR_CENTER_POINT',
  WAITING_FOR_POINT_ON_CIRCLE = 'WAITING_FOR_POINT_ON_CIRCLE',
  INIT = 'INIT',
}

export enum CircleAction {
  INIT_CIRCLE_TOOL = 'INIT_CIRCLE_TOOL',
  RECORD_START_POINT = 'RECORD_START_POINT',
  DRAW_TEMP_CIRCLE = 'DRAW_TEMP_CIRCLE',
  DRAW_FINAL_CIRCLE = 'DRAW_FINAL_CIRCLE',
}

export const circleToolStateMachine = createMachine(
  {
    types: {} as {
      context: CircleContext;
      events: StateEvent;
    },
    context: {
      centerPoint: null,
      type: Tool.CIRCLE,
    },
    initial: CircleState.INIT,
    states: {
      [CircleState.INIT]: {
        description: 'Initializing the circle tool',
        always: {
          actions: CircleAction.INIT_CIRCLE_TOOL,
          target: CircleState.WAITING_FOR_CENTER_POINT,
        },
      },
      [CircleState.WAITING_FOR_CENTER_POINT]: {
        description: 'Select the center point of the circle tool',
        meta: {
          instructions: 'Select the center point of the circle',
        },
        on: {
          MOUSE_CLICK: {
            actions: CircleAction.RECORD_START_POINT,
            target: CircleState.WAITING_FOR_POINT_ON_CIRCLE,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: CircleAction.RECORD_START_POINT,
            target: CircleState.WAITING_FOR_POINT_ON_CIRCLE,
          },
        },
      },
      [CircleState.WAITING_FOR_POINT_ON_CIRCLE]: {
        description: 'Select a point on the circle',
        meta: {
          instructions: 'Select the point on the circle',
        },
        on: {
          DRAW: {
            actions: CircleAction.DRAW_TEMP_CIRCLE,
          },
          MOUSE_CLICK: {
            actions: CircleAction.DRAW_FINAL_CIRCLE,
            target: CircleState.INIT,
          },
          NUMBER_INPUT: {
            actions: CircleAction.DRAW_FINAL_CIRCLE,
            target: LineState.INIT,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: CircleAction.DRAW_FINAL_CIRCLE,
            target: LineState.INIT,
          },
          RELATIVE_POINT_INPUT: {
            actions: CircleAction.DRAW_FINAL_CIRCLE,
            target: LineState.INIT,
          },
          ESC: {
            target: CircleState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [CircleAction.INIT_CIRCLE_TOOL]: assign(() => {
        setShouldDrawHelpers(true);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        setAngleGuideOriginPoint(null);
        return {
          centerPoint: null,
        };
      }),
      [CircleAction.RECORD_START_POINT]: assign(({ event }) => {
        const startPoint = getPointFromEvent(null, event as PointInputEvent);
        setAngleGuideOriginPoint(startPoint);
        return {
          centerPoint: startPoint,
        };
      }),
      [CircleAction.DRAW_TEMP_CIRCLE]: ({ context, event }) => {
        const activeCircle = new CircleEntity(
          context.centerPoint as Point,
          pointDistance(
            (event as DrawEvent).drawController.getWorldMouseLocation(),
            context.centerPoint as Point,
          ),
        );
        activeCircle.lineColor = getActiveLineColor();
        activeCircle.lineWidth = getActiveLineWidth();
        setGhostHelperEntities([activeCircle]);
      },
      [CircleAction.DRAW_FINAL_CIRCLE]: assign(({ context, event }) => {
        if (!context.centerPoint) {
          throw new Error(
            'Trying to DRAW_FINAL_CIRCLE when centerPoint is not yet defined in circle tool',
          );
        }
        const pointOnCircle: Point = getPointFromEvent(
          context.centerPoint,
          event as PointInputEvent,
        );
        const activeCircle = new CircleEntity(
          context.centerPoint as Point,
          pointDistance(pointOnCircle, context.centerPoint as Point),
        );
        activeCircle.lineColor = getActiveLineColor();
        activeCircle.lineWidth = getActiveLineWidth();
        addEntities([activeCircle], true);

        setGhostHelperEntities([]);
        return {
          centerPoint: null,
        };
      }),
    },
  },
);
