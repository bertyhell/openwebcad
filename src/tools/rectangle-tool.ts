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
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum RectangleAction {
  INIT_RECTANGLE_TOOL = 'INIT_RECTANGLE_TOOL',
  RECORD_START_POINT = 'RECORD_START_POINT',
  DRAW_TEMP_RECTANGLE = 'DRAW_TEMP_RECTANGLE',
  DRAW_FINAL_RECTANGLE = 'DRAW_FINAL_RECTANGLE',
  RESET_ACTIVE_ENTITY = 'RESET_ACTIVE_ENTITY',
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
    initial: RectangleState.WAITING_FOR_START_POINT,
    states: {
      [RectangleState.WAITING_FOR_START_POINT]: {
        always: {
          actions: RectangleAction.INIT_RECTANGLE_TOOL,
        },
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
            target: RectangleState.WAITING_FOR_END_POINT,
          },
          ESC: {
            actions: RectangleAction.RESET_ACTIVE_ENTITY,
            target: RectangleState.WAITING_FOR_START_POINT,
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
      [RectangleAction.RECORD_START_POINT]: assign({
        startPoint: ({ event }) => {
          return (event as MouseClickEvent).worldClickPoint;
        },
      }),
      [RectangleAction.DRAW_TEMP_RECTANGLE]: ({ context, event }) => {
        console.log('drawTempRectangle', { context, event });

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
      [RectangleAction.RESET_ACTIVE_ENTITY]: assign(() => {
        setActiveEntity(null);
        return {
          startPoint: null,
        };
      }),
    },
  },
);

export const rectangleToolActor = createActor(rectangleToolStateMachine);
rectangleToolActor.subscribe(state => {
  console.log('rectangle tool state:', state.value);
});
