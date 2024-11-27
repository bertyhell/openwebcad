import { Point } from '@flatten-js/core';
import {
  getNotSelectedEntities,
  setEntities,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import {
  DrawEvent,
  MouseClickEvent,
  StateEvent,
  ToolContext,
} from './tool.types';
import { Tool } from '../tools';
import { assign, createMachine } from 'xstate';
import {
  drawTempSelectionRectangle,
  handleFirstSelectionPoint,
  selectEntitiesInsideRectangle,
} from './select-tool.helpers';

export interface SelectContext extends ToolContext {
  startPoint: Point | null;
}

export enum SelectState {
  INIT = 'INIT',
  WAITING_FOR_FIRST_SELECT_POINT = 'WAITING_FOR_FIRST_SELECT_POINT',
  CHECK_SELECTION = 'CHECK_SELECTION',
  WAITING_FOR_SECOND_SELECT_POINT = 'WAITING_FOR_SECOND_SELECT_POINT',
  SELECTION_COMPLETED = 'SELECTION_COMPLETED',
}

export enum SelectAction {
  INIT_SELECT_TOOL = 'INIT_SELECT_TOOL',
  HANDLE_FIRST_SELECT_POINT = 'HANDLE_FIRST_SELECT_POINT',
  SELECT_ENTITIES_INSIDE_RECTANGLE = 'SELECT_ENTITIES_INSIDE_RECTANGLE',
  DRAW_TEMP_SELECTION_RECTANGLE = 'DRAW_TEMP_SELECTION_RECTANGLE',
  DELETE_SELECTED_ENTITIES = 'DELETE_SELECTED_ENTITIES',
}

export const selectToolStateMachine = createMachine(
  {
    types: {} as {
      context: SelectContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      type: Tool.SELECT,
    },
    initial: SelectState.INIT,
    states: {
      [SelectState.INIT]: {
        description: 'Initializing the select tool',
        always: {
          actions: SelectAction.INIT_SELECT_TOOL,
          target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
        },
      },
      [SelectState.WAITING_FOR_FIRST_SELECT_POINT]: {
        description:
          'Select a line or select the first point of a selection rectangle',
        meta: {
          instructions: 'Select a line or start drawing a selection rectangle',
        },
        on: {
          MOUSE_CLICK: {
            actions: SelectAction.HANDLE_FIRST_SELECT_POINT,
            target: SelectState.CHECK_SELECTION,
          },
          ESC: {
            actions: SelectAction.INIT_SELECT_TOOL,
          },
          ENTER: {
            target: SelectState.SELECTION_COMPLETED,
          },
          DELETE: {
            actions: SelectAction.DELETE_SELECTED_ENTITIES,
            target: SelectState.INIT,
          },
        },
      },
      [SelectState.CHECK_SELECTION]: {
        description:
          'Checking to select one line or start drawing a selection rectangle',
        meta: {
          instructions:
            'Select one line or start drawing a selection rectangle',
        },
        always: [
          {
            // User started drawing a selection rectangle
            guard: ({ context }: { context: SelectContext }) =>
              !!context.startPoint,
            target: SelectState.WAITING_FOR_SECOND_SELECT_POINT,
          },
          {
            // User clicked on an entity
            guard: ({ context }: { context: SelectContext }) =>
              !context.startPoint,
            target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
          },
        ],
      },
      [SelectState.WAITING_FOR_SECOND_SELECT_POINT]: {
        description: 'Select the second point of a selection rectangle',
        meta: {
          instructions: 'Select the second point of a selection rectangle',
        },
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
      [SelectState.SELECTION_COMPLETED]: {
        description: 'Selection completed',
        type: 'final',
      },
    },
  },
  {
    actions: {
      INIT_SELECT_TOOL: () => {
        setShouldDrawHelpers(false);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
      },
      HANDLE_FIRST_SELECT_POINT: assign(
        ({ context, event }: { context: SelectContext; event: StateEvent }) => {
          return handleFirstSelectionPoint(context, event as MouseClickEvent);
        },
      ),
      DRAW_TEMP_SELECTION_RECTANGLE: ({
        context,
        event,
      }: {
        context: SelectContext;
        event: StateEvent;
      }) => {
        if (!context.startPoint) {
          // assert
          throw new Error(
            '[SELECT] Calling drawTempSelectionRectangle without startPoint set',
          );
        }
        drawTempSelectionRectangle(
          context.startPoint as Point,
          (event as DrawEvent).drawController.getWorldMouseLocation(),
        );
      },
      SELECT_ENTITIES_INSIDE_RECTANGLE: ({
        context,
        event,
      }: {
        context: SelectContext;
        event: StateEvent;
      }) => {
        if (!context.startPoint) {
          //
          throw new Error(
            '[SELECT] calling SELECT_ENTITIES_INSIDE_RECTANGLE without start point',
          );
        }
        selectEntitiesInsideRectangle(
          context.startPoint,
          (event as MouseClickEvent).worldMouseLocation,
          (event as MouseClickEvent).holdingCtrl,
          // (event as MouseClickEvent).holdingShift,
        );
        setGhostHelperEntities([]);
      },
      DELETE_SELECTED_ENTITIES: () => {
        setEntities(getNotSelectedEntities(), true);
        setSelectedEntityIds([]);
        setGhostHelperEntities([]);
      },
      RESET_SELECTION: assign(() => {
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
        };
      }),
    },
  },
);
