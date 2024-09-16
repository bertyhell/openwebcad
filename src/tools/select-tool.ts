import { Point } from '@flatten-js/core';
import {
  setActiveEntity,
  setActiveTool,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { DrawEvent, KeyboardEscEvent, MouseClickEvent } from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';
import {
  drawTempSelectionRectangle,
  handleFirstSelectionPoint,
  selectEntitiesInsideRectangle,
} from './select-tool.helpers.ts';

export interface SelectContext {
  startPoint: Point | null;
}

export enum SelectState {
  INIT = 'INIT',
  WAITING_FOR_FIRST_SELECT_POINT = 'WAITING_FOR_FIRST_SELECT_POINT',
  CHECK_SELECTION = 'CHECK_SELECTION',
  WAITING_FOR_SECOND_SELECT_POINT = 'WAITING_FOR_SECOND_SELECT_POINT',
}

export enum SelectAction {
  INIT_SELECT_TOOL = 'INIT_SELECT_TOOL',
  HANDLE_FIRST_SELECT_POINT = 'HANDLE_FIRST_SELECT_POINT',
  SELECT_ENTITIES_INSIDE_RECTANGLE = 'SELECT_ENTITIES_INSIDE_RECTANGLE',
  DRAW_TEMP_SELECTION_RECTANGLE = 'DRAW_TEMP_SELECTION_RECTANGLE',
}

const selectToolStateMachine = createMachine(
  {
    types: {} as {
      context: SelectContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      startPoint: null,
    },
    initial: SelectState.INIT,
    states: {
      [SelectState.INIT]: {
        always: {
          actions: SelectAction.INIT_SELECT_TOOL,
          target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
        },
      },
      [SelectState.WAITING_FOR_FIRST_SELECT_POINT]: {
        on: {
          MOUSE_CLICK: {
            actions: SelectAction.HANDLE_FIRST_SELECT_POINT,
            target: SelectState.CHECK_SELECTION,
          },
          ESC: {
            actions: SelectAction.INIT_SELECT_TOOL,
          },
        },
      },
      [SelectState.CHECK_SELECTION]: {
        always: [
          {
            // User started drawing a selection rectangle
            guard: args => !!args.context.startPoint,
            target: SelectState.WAITING_FOR_SECOND_SELECT_POINT,
          },
          {
            // User clicked on an entity
            guard: args => !args.context.startPoint,
            target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
          },
        ],
      },
      [SelectState.WAITING_FOR_SECOND_SELECT_POINT]: {
        on: {
          DRAW: {
            actions: SelectAction.DRAW_TEMP_SELECTION_RECTANGLE,
          },
          MOUSE_CLICK: {
            actions: SelectAction.SELECT_ENTITIES_INSIDE_RECTANGLE,
            target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
          },
          ESC: {
            target: SelectState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      INIT_SELECT_TOOL: () => {
        console.log('activate select tool');
        setActiveTool(Tool.Select);
        setShouldDrawHelpers(false);
        setActiveEntity(null);
        setSelectedEntityIds([]);
      },
      HANDLE_FIRST_SELECT_POINT: assign(({ context, event }) => {
        return handleFirstSelectionPoint(context, event as MouseClickEvent);
      }),
      DRAW_TEMP_SELECTION_RECTANGLE: ({ context, event }) => {
        if (!context.startPoint) {
          // assert
          throw new Error(
            '[SELECT] Calling drawTempSelectionRectangle without startPoint set',
          );
        }
        drawTempSelectionRectangle(
          context.startPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
      },
      SELECT_ENTITIES_INSIDE_RECTANGLE: assign(({ context, event }) => {
        if (!context.startPoint) {
          //
          throw new Error(
            '[SELECT] calling SELECT_ENTITIES_INSIDE_RECTANGLE without start point',
          );
        }
        selectEntitiesInsideRectangle(
          context.startPoint,
          (event as MouseClickEvent).worldClickPoint,
          (event as MouseClickEvent).holdingCtrl,
          // (event as MouseClickEvent).holdingShift,
        );
        setActiveEntity(null);
        return {
          startPoint: null,
        };
      }),
      RESET_SELECTION: assign(() => {
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
        };
      }),
    },
  },
);

export const selectToolActor = createActor(selectToolStateMachine);
