import { Point, Vector } from '@flatten-js/core';
import { LineEntity } from '../entities/LineEntity';
import {
  addEntity,
  getActiveLineColor,
  getActiveLineWidth,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { assign, createMachine } from 'xstate';
import {
  DrawEvent,
  MouseClickEvent,
  NumberInputEvent,
  StateEvent,
  ToolContext,
} from './tool.types';

export interface LineContext extends ToolContext {
  startPoint: Point | null;
}

export enum LineState {
  INIT = 'INIT',
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum LineAction {
  INIT_LINE_TOOL = 'INIT_LINE_TOOL',
  RECORD_START_POINT = 'RECORD_START_POINT',
  DRAW_TEMP_LINE = 'DRAW_TEMP_LINE',
  DRAW_FINAL_LINE = 'DRAW_FINAL_LINE',
}

export const lineToolStateMachine = createMachine(
  {
    types: {} as {
      context: LineContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      type: Tool.LINE,
    },
    initial: LineState.INIT,
    states: {
      [LineState.INIT]: {
        description: 'Initializing the line tool',
        always: {
          actions: LineAction.INIT_LINE_TOOL,
          target: LineState.WAITING_FOR_START_POINT,
        },
      },
      [LineState.WAITING_FOR_START_POINT]: {
        description: 'Select the start point of the line',
        meta: {
          instructions: 'Select the start point of the line',
        },
        on: {
          MOUSE_CLICK: {
            actions: LineAction.RECORD_START_POINT,
            target: LineState.WAITING_FOR_END_POINT,
          },
        },
      },
      [LineState.WAITING_FOR_END_POINT]: {
        description: 'Select the end point of the line',
        meta: {
          instructions: 'Select the end point of the line',
        },
        on: {
          DRAW: {
            actions: LineAction.DRAW_TEMP_LINE,
          },
          MOUSE_CLICK: {
            actions: LineAction.DRAW_FINAL_LINE,
            target: LineState.WAITING_FOR_END_POINT,
          },
          NUMBER_INPUT: {
            actions: LineAction.DRAW_FINAL_LINE,
            target: LineState.WAITING_FOR_END_POINT,
          },
          ESC: {
            target: LineState.INIT,
          },
          ENTER: {
            target: LineState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [LineAction.INIT_LINE_TOOL]: assign(() => {
        setShouldDrawHelpers(true);
        setSelectedEntityIds([]);
        setGhostHelperEntities([]);
        setAngleGuideOriginPoint(null);
        return {
          startPoint: null,
        };
      }),
      [LineAction.RECORD_START_POINT]: assign(({ event }) => {
        setAngleGuideOriginPoint((event as MouseClickEvent).worldClickPoint);
        return {
          startPoint: (event as MouseClickEvent).worldClickPoint,
        };
      }),
      [LineAction.DRAW_TEMP_LINE]: ({ context, event }) => {
        const activeLine = new LineEntity(
          context.startPoint as Point,
          (event as DrawEvent).drawController.getWorldMouseLocation(),
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        setGhostHelperEntities([activeLine]);
      },
      [LineAction.DRAW_FINAL_LINE]: assign(({ context, event }) => {
        console.log('drawFinalLine', { context, event });
        if (!context.startPoint) {
          throw new Error(
            'Start point is not set during DRAW_FINAL_LINE in LineEntity',
          );
        }
        let endPoint;
        if (event.type === 'NUMBER_INPUT') {
          const distance = (event as NumberInputEvent).value;
          // Direction indicated by the startPoint and the mouse location
          const direction = new Vector(
            event.worldClickPoint.x - context.startPoint.x,
            event.worldClickPoint.y - context.startPoint.y,
          );
          const unitDirection = direction.normalize();
          endPoint = context.startPoint.translate(
            unitDirection.multiply(distance),
          );
        } else if (event.type === 'MOUSE_CLICK') {
          endPoint = (event as MouseClickEvent).worldClickPoint;
        } else {
          throw new Error(
            'Received unexpected event type in DRAW_FINAL_LINE of LineEntity',
          );
        }
        const activeLine = new LineEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        addEntity(activeLine);

        // Keep drawing from the last point
        setGhostHelperEntities([new LineEntity(endPoint, endPoint)]);
        setAngleGuideOriginPoint(endPoint);
        return {
          startPoint: endPoint,
        };
      }),
    },
  },
);
