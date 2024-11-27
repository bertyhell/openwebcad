import { Point } from '@flatten-js/core';
import { LineEntity } from '../entities/LineEntity';
import {
  addEntities,
  getActiveLineColor,
  getActiveLineWidth,
  setActiveToolActor,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { Actor, assign, createMachine } from 'xstate';
import {
  DrawEvent,
  PointInputEvent,
  StateEvent,
  ToolContext,
} from './tool.types';
import { selectToolStateMachine } from './select-tool.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';

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
  SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
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
          ABSOLUTE_POINT_INPUT: {
            actions: LineAction.RECORD_START_POINT,
            target: LineState.WAITING_FOR_END_POINT,
          },
          ESC: {
            actions: LineAction.SWITCH_TO_SELECT_TOOL,
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
          ABSOLUTE_POINT_INPUT: {
            actions: LineAction.DRAW_FINAL_LINE,
            target: LineState.WAITING_FOR_END_POINT,
          },
          RELATIVE_POINT_INPUT: {
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
        const startPoint = getPointFromEvent(null, event as PointInputEvent);
        setAngleGuideOriginPoint(startPoint);
        return {
          startPoint,
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
        if (!context.startPoint) {
          throw new Error(
            'Start point is not set during DRAW_FINAL_LINE in LineEntity',
          );
        }

        const endPoint = getPointFromEvent(
          context.startPoint,
          event as PointInputEvent,
        );
        const activeLine = new LineEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        addEntities([activeLine], true);

        // Keep drawing from the last point
        setGhostHelperEntities([new LineEntity(endPoint, endPoint)]);
        setAngleGuideOriginPoint(endPoint);
        return {
          startPoint: endPoint,
        };
      }),
      [LineAction.SWITCH_TO_SELECT_TOOL]: () => {
        setActiveToolActor(new Actor(selectToolStateMachine));
      },
    },
  },
);
