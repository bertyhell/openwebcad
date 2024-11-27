import { Point } from '@flatten-js/core';
import { RectangleEntity } from '../entities/RectangleEntity';
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
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';

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
          ABSOLUTE_POINT_INPUT: {
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
          NUMBER_INPUT: {
            actions: RectangleAction.DRAW_FINAL_RECTANGLE, // TODO see if we want to add a flow where you enter the width and then the height if one of the dimensions of the "direction + distance" comes out to 0
            target: RectangleState.INIT,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: RectangleAction.DRAW_FINAL_RECTANGLE,
            target: RectangleState.INIT,
          },
          RELATIVE_POINT_INPUT: {
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
        const startPoint = getPointFromEvent(null, event as PointInputEvent);
        setAngleGuideOriginPoint(startPoint);
        return {
          startPoint,
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
          (event as DrawEvent).drawController.getWorldMouseLocation(),
        );
        activeRectangle.lineColor = getActiveLineColor();
        activeRectangle.lineWidth = getActiveLineWidth();
        setGhostHelperEntities([activeRectangle]);
      },
      [RectangleAction.DRAW_FINAL_RECTANGLE]: ({ context, event }) => {
        if (!context.startPoint) {
          throw Error(
            'Trying to DRAW_FINAL_RECTANGLE when startPoint is not defined in rectangle-tool',
          );
        }
        const endPoint = getPointFromEvent(
          context.startPoint,
          event as PointInputEvent,
        );

        const activeRectangle = new RectangleEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeRectangle.lineColor = getActiveLineColor();
        activeRectangle.lineWidth = getActiveLineWidth();
        addEntities([activeRectangle], true);
      },
    },
  },
);
