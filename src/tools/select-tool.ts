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
  handleSecondSelectionPoint,
} from './select-tool.helpers.ts';

export interface SelectContext {
  startPoint: Point | null;
}

export enum SelectState {
  WAITING_FOR_FIRST_SELECT_POINT = 'WAITING_FOR_FIRST_SELECT_POINT',
  WAITING_FOR_SECOND_SELECT_POINT = 'WAITING_FOR_SECOND_SELECT_POINT',
}

export enum SelectAction {
  INIT_SELECT_TOOL = 'INIT_SELECT_TOOL',
  HANDLE_FIRST_SELECT_POINT = 'HANDLE_FIRST_SELECT_POINT',
  RESET_SELECTION = 'RESET_SELECTION',
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
    initial: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
    states: {
      [SelectState.WAITING_FOR_FIRST_SELECT_POINT]: {
        always: {
          actions: SelectAction.INIT_SELECT_TOOL,
        },
        on: {
          MOUSE_CLICK: {
            actions: SelectAction.HANDLE_FIRST_SELECT_POINT,
            guard: args => !!args.context.startPoint,
            target: SelectState.WAITING_FOR_SECOND_SELECT_POINT,
          },
          ESC: {
            actions: SelectAction.RESET_SELECTION,
          },
        },
      },
      [SelectState.WAITING_FOR_SECOND_SELECT_POINT]: {
        on: {
          DRAW: {
            actions: SelectAction.DRAW_TEMP_SELECTION_RECTANGLE,
          },
          MOUSE_CLICK: {
            actions: SelectAction.SELECT_ENTITIES_INSIDE_RECTANGLE,
            target: SelectState.WAITING_FOR_SECOND_SELECT_POINT,
          },
          ESC: {
            actions: SelectAction.RESET_SELECTION,
            target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
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
      },
      HANDLE_FIRST_SELECT_POINT: assign(({ context, event }) => {
        return handleFirstSelectionPoint(context, event as MouseClickEvent);
      }),
      HANDLE_SECOND_SELECT_POINT: assign(({ context, event }) => {
        return handleSecondSelectionPoint(context, event as MouseClickEvent);
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
selectToolActor.subscribe(state => {
  console.log('select tool state:', state.value);
});
