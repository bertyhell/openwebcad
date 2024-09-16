import { CircleEntity } from '../entities/CircleEntity.ts';
import { Point } from '@flatten-js/core';
import {
  addEntity,
  getActiveLineColor,
  getActiveLineWidth,
  setActiveEntity,
  setActiveTool,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { DrawEvent, KeyboardEscEvent, MouseClickEvent } from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';

export interface CircleContext {
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

const circleToolStateMachine = createMachine(
  {
    types: {} as {
      context: CircleContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      centerPoint: null,
    },
    initial: CircleState.INIT,
    states: {
      [CircleState.INIT]: {
        always: {
          actions: CircleAction.INIT_CIRCLE_TOOL,
          target: CircleState.WAITING_FOR_CENTER_POINT,
        },
      },
      [CircleState.WAITING_FOR_CENTER_POINT]: {
        on: {
          MOUSE_CLICK: {
            actions: CircleAction.RECORD_START_POINT,
            target: CircleState.WAITING_FOR_POINT_ON_CIRCLE,
          },
        },
      },
      [CircleState.WAITING_FOR_POINT_ON_CIRCLE]: {
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
        setActiveTool(Tool.Circle);
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {
          centerPoint: null,
        };
      }),
      [CircleAction.RECORD_START_POINT]: assign({
        centerPoint: ({ event }) => {
          return (event as MouseClickEvent).worldClickPoint;
        },
      }),
      [CircleAction.DRAW_TEMP_CIRCLE]: ({ context, event }) => {
        console.log('drawTempCircle', { context, event });

        const activeCircle = new CircleEntity(
          context.centerPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        activeCircle.lineColor = getActiveLineColor();
        activeCircle.lineWidth = getActiveLineWidth();
        setActiveEntity(activeCircle);
      },
      [CircleAction.DRAW_FINAL_CIRCLE]: assign(({ context, event }) => {
        console.log('drawFinalCircle', { context, event });
        const pointOnCircle = (event as MouseClickEvent).worldClickPoint;
        const activeCircle = new CircleEntity(
          context.centerPoint as Point,
          pointOnCircle,
        );
        activeCircle.lineColor = getActiveLineColor();
        activeCircle.lineWidth = getActiveLineWidth();
        addEntity(activeCircle);

        setActiveEntity(null);
        return {
          centerPoint: null,
        };
      }),
    },
  },
);

export const circleToolActor = createActor(circleToolStateMachine);
