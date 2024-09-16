import { Point } from '@flatten-js/core';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
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

export interface RectangleContext {
  startPoint: Point | null;
}

export enum RectangleState {
  INIT = 'INIT',
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum RectangleAction {
  INIT_RECTANGLE_TOOL = 'INIT_RECTANGLE_TOOL',
  RECORD_START_POINT = 'RECORD_START_POINT',
  DRAW_TEMP_RECTANGLE = 'DRAW_TEMP_RECTANGLE',
  DRAW_FINAL_RECTANGLE = 'DRAW_FINAL_RECTANGLE',
}

const rectangleToolStateMachine = createMachine(
  {
    types: {} as {
      context: RectangleContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      startPoint: null,
    },
    initial: RectangleState.INIT,
    states: {
      [RectangleState.INIT]: {
        always: {
          actions: RectangleAction.INIT_RECTANGLE_TOOL,
          target: RectangleState.WAITING_FOR_START_POINT,
        },
      },
      [RectangleState.WAITING_FOR_START_POINT]: {
        on: {
          MOUSE_CLICK: {
            actions: RectangleAction.RECORD_START_POINT,
            target: RectangleState.WAITING_FOR_END_POINT,
          },
        },
      },
      [RectangleState.WAITING_FOR_END_POINT]: {
        on: {
          DRAW: {
            actions: RectangleAction.DRAW_TEMP_RECTANGLE,
          },
          MOUSE_CLICK: {
            actions: RectangleAction.DRAW_FINAL_RECTANGLE,
            target: RectangleState.INIT,
          },
          ESC: {
            target: RectangleState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [RectangleAction.INIT_RECTANGLE_TOOL]: () => {
        console.log('activate rectangle tool');
        setActiveTool(Tool.Rectangle);
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
      },
      [RectangleAction.RECORD_START_POINT]: assign(({ event }) => {
        return {
          startPoint: (event as MouseClickEvent).worldClickPoint,
        };
      }),
      [RectangleAction.DRAW_TEMP_RECTANGLE]: ({ context, event }) => {
        console.log('drawTempRectangle', { context, event });

        if (!context.startPoint) {
          throw new Error(
            '[RECTANGLE]: calling draw without start point being set',
          );
        }
        const activeRectangle = new RectangleEntity(
          context.startPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        activeRectangle.lineColor = getActiveLineColor();
        activeRectangle.lineWidth = getActiveLineWidth();
        setActiveEntity(activeRectangle);
      },
      [RectangleAction.DRAW_FINAL_RECTANGLE]: assign(({ context, event }) => {
        console.log('drawFinalRectangle', { context, event });
        const endPoint = (event as MouseClickEvent).worldClickPoint;
        const activeRectangle = new RectangleEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeRectangle.lineColor = getActiveLineColor();
        activeRectangle.lineWidth = getActiveLineWidth();
        addEntity(activeRectangle);

        setActiveEntity(null);
        return {
          startPoint: null,
        };
      }),
    },
  },
);

export const rectangleToolActor = createActor(rectangleToolStateMachine);
