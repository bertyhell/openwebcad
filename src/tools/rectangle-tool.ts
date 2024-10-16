import { Point } from '@flatten-js/core';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
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

export interface RectangleContext extends ToolContext {
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

export const rectangleToolStateMachine = createMachine(
  {
    types: {} as {
      context: RectangleContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      type: Tool.RECTANGLE,
    },
    initial: RectangleState.INIT,
    states: {
      [RectangleState.INIT]: {
        description: 'Initializing the rectangle tool',
        always: {
          actions: RectangleAction.INIT_RECTANGLE_TOOL,
          target: RectangleState.WAITING_FOR_START_POINT,
        },
      },
      [RectangleState.WAITING_FOR_START_POINT]: {
        description: 'Select the start point of the rectangle',
        meta: {
          instructions: 'Select the start point of the rectangle',
        },
        on: {
          MOUSE_CLICK: {
            actions: RectangleAction.RECORD_START_POINT,
            target: RectangleState.WAITING_FOR_END_POINT,
          },
        },
      },
      [RectangleState.WAITING_FOR_END_POINT]: {
        description: 'Select the end point of the rectangle',
        meta: {
          instructions: 'Select the end point of the rectangle',
        },
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
        setShouldDrawHelpers(true);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        setAngleGuideOriginPoint(null);
      },
      [RectangleAction.RECORD_START_POINT]: assign(({ event }) => {
        setAngleGuideOriginPoint((event as MouseClickEvent).worldClickPoint);
        return {
          startPoint: (event as MouseClickEvent).worldClickPoint,
        };
      }),
      [RectangleAction.DRAW_TEMP_RECTANGLE]: ({ context, event }) => {
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
        setGhostHelperEntities([activeRectangle]);
      },
      [RectangleAction.DRAW_FINAL_RECTANGLE]: ({ context, event }) => {
        const endPoint = (event as MouseClickEvent).worldClickPoint;
        const activeRectangle = new RectangleEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeRectangle.lineColor = getActiveLineColor();
        activeRectangle.lineWidth = getActiveLineWidth();
        addEntity(activeRectangle);
      },
    },
  },
);
