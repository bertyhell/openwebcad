import { CircleEntity } from '../entities/CircleEntity.ts';
import { Point } from '@flatten-js/core';
import {
  addEntity,
  getActiveLineColor,
  getActiveLineWidth,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import {
  DrawEvent,
  MouseClickEvent,
  StateEvent,
  ToolContext,
} from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createMachine } from 'xstate';
import { pointDistance } from '../helpers/distance-between-points.ts';

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
        console.log('activate circle tool');
        setShouldDrawHelpers(true);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        setAngleGuideOriginPoint(null);
        return {
          centerPoint: null,
        };
      }),
      [CircleAction.RECORD_START_POINT]: assign(({ event }) => {
        setAngleGuideOriginPoint((event as MouseClickEvent).worldClickPoint);
        return {
          centerPoint: (event as MouseClickEvent).worldClickPoint,
        };
      }),
      [CircleAction.DRAW_TEMP_CIRCLE]: ({ context, event }) => {
        console.log('drawTempCircle', { context, event });

        const activeCircle = new CircleEntity(
          context.centerPoint as Point,
          pointDistance(
            (event as DrawEvent).drawInfo.worldMouseLocation,
            context.centerPoint as Point,
          ),
        );
        activeCircle.lineColor = getActiveLineColor();
        activeCircle.lineWidth = getActiveLineWidth();
        setGhostHelperEntities([activeCircle]);
      },
      [CircleAction.DRAW_FINAL_CIRCLE]: assign(({ context, event }) => {
        console.log('drawFinalCircle', { context, event });
        const pointOnCircle = (event as MouseClickEvent).worldClickPoint;
        const activeCircle = new CircleEntity(
          context.centerPoint as Point,
          pointDistance(pointOnCircle, context.centerPoint as Point),
        );
        activeCircle.lineColor = getActiveLineColor();
        activeCircle.lineWidth = getActiveLineWidth();
        addEntity(activeCircle);

        setGhostHelperEntities([]);
        return {
          centerPoint: null,
        };
      }),
    },
  },
);
