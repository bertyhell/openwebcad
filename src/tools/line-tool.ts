import { Point } from '@flatten-js/core';
import { LineEntity } from '../entities/LineEntity.ts';
import {
  addEntity,
  getActiveLineColor,
  getActiveLineWidth,
  setActiveEntity,
  setActiveTool,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';
import { DrawEvent, KeyboardEscEvent, MouseClickEvent } from './tool.types.ts';

export interface LineContext {
  startPoint: Point | null;
}

export enum LineState {
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum LineAction {
  INIT_LINE_TOOL = 'INIT_LINE_TOOL',
  RECORD_START_POINT = 'RECORD_START_POINT',
  DRAW_TEMP_LINE = 'DRAW_TEMP_LINE',
  DRAW_FINAL_LINE = 'DRAW_FINAL_LINE',
  RESET_ACTIVE_ENTITY = 'RESET_ACTIVE_ENTITY',
}

const lineToolStateMachine = createMachine(
  {
    types: {} as {
      context: LineContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      startPoint: null,
    },
    initial: LineState.WAITING_FOR_START_POINT,
    states: {
      [LineState.WAITING_FOR_START_POINT]: {
        always: {
          actions: LineAction.INIT_LINE_TOOL,
        },
        on: {
          MOUSE_CLICK: {
            actions: LineAction.RECORD_START_POINT,
            target: LineState.WAITING_FOR_END_POINT,
          },
        },
      },
      [LineState.WAITING_FOR_END_POINT]: {
        on: {
          DRAW: {
            actions: LineAction.DRAW_TEMP_LINE,
          },
          MOUSE_CLICK: {
            actions: LineAction.DRAW_FINAL_LINE,
            target: LineState.WAITING_FOR_END_POINT,
          },
          ESC: {
            actions: LineAction.RESET_ACTIVE_ENTITY,
            target: LineState.WAITING_FOR_START_POINT,
          },
        },
      },
    },
  },
  {
    actions: {
      [LineAction.INIT_LINE_TOOL]: () => {
        console.log('activate line tool');
        setActiveTool(Tool.Line);
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
      },
      [LineAction.RECORD_START_POINT]: assign({
        startPoint: ({ event }) => {
          return (event as MouseClickEvent).worldClickPoint;
        },
      }),
      [LineAction.DRAW_TEMP_LINE]: ({ context, event }) => {
        console.log('drawTempLine', { context, event });

        const activeLine = new LineEntity(
          context.startPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        setActiveEntity(activeLine);
      },
      [LineAction.DRAW_FINAL_LINE]: assign(({ context, event }) => {
        console.log('drawFinalLine', { context, event });
        const endPoint = (event as MouseClickEvent).worldClickPoint;
        const activeLine = new LineEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        addEntity(activeLine);

        // Keep drawing from the last point
        setActiveEntity(new LineEntity(endPoint));
        return {
          startPoint: endPoint,
        };
      }),
      [LineAction.RESET_ACTIVE_ENTITY]: assign(() => {
        setActiveEntity(null);
        return {
          startPoint: null,
        };
      }),
    },
  },
);

export const lineToolActor = createActor(lineToolStateMachine);
lineToolActor.subscribe(state => {
  console.log('line tool state:', state.value);
});
