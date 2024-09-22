import { Point } from '@flatten-js/core';
import {
  getSelectedEntityIds,
  setActiveEntity,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import { MouseClickEvent, StateEvent, ToolContext } from './tool.types.ts';
import { assign, createMachine } from 'xstate';
import { moveSelection } from './move-tool.helpers.ts';
import { selectToolStateMachine } from './select-tool.ts';

export interface MoveContext extends ToolContext {
  startPoint: Point | null;
}

export enum MoveState {
  INIT = 'INIT',
  CHECK_SELECTION = 'CHECK_SELECTION',
  WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
  WAITING_FOR_START_MOVE_POINT = 'WAITING_FOR_START_MOVE_POINT',
  WAITING_FOR_END_MOVE_POINT = 'WAITING_FOR_END_MOVE_POINT',
}

export enum MoveAction {
  INIT_MOVE_TOOL = 'INIT_MOVE_TOOL',
  ENABLE_HELPERS = 'ENABLE_HELPERS',
  RECORD_START_POINT = 'RECORD_START_POINT',
  MOVE_SELECTION = 'MOVE_SELECTION',
  DESELECT_ENTITIES = 'DESELECT_ENTITIES',
}

export const moveToolStateMachine = createMachine(
  {
    types: {} as {
      context: MoveContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      type: Tool.MOVE,
    },
    initial: MoveState.INIT,
    states: {
      [MoveState.INIT]: {
        description: 'Initializing the move tool',
        always: {
          actions: MoveAction.INIT_MOVE_TOOL,
          target: MoveState.WAITING_FOR_SELECTION,
        },
      },
      [MoveState.CHECK_SELECTION]: {
        description: 'Check if there is something selected',
        always: [
          {
            guard: () => getSelectedEntityIds().length > 0,
            target: MoveState.WAITING_FOR_START_MOVE_POINT,
          },
          {
            guard: () => getSelectedEntityIds().length === 0,
            target: MoveState.WAITING_FOR_SELECTION,
          },
        ],
      },
      [MoveState.WAITING_FOR_SELECTION]: {
        description: 'Select what you want to move',
        invoke: {
          id: 'selectTool',
          src: selectToolStateMachine,
          onDone: {
            target: MoveState.CHECK_SELECTION,
          },
        },
      },
      [MoveState.WAITING_FOR_START_MOVE_POINT]: {
        description: 'Select the start of the move line',
        always: {
          actions: MoveAction.ENABLE_HELPERS,
        },
        on: {
          MOUSE_CLICK: {
            actions: MoveAction.RECORD_START_POINT,
            target: MoveState.WAITING_FOR_END_MOVE_POINT,
          },
          ESC: {
            actions: MoveAction.DESELECT_ENTITIES,
            target: MoveState.INIT,
          },
        },
      },
      [MoveState.WAITING_FOR_END_MOVE_POINT]: {
        description: 'Select the end of the move line',
        on: {
          MOUSE_CLICK: {
            actions: [MoveAction.MOVE_SELECTION, MoveAction.DESELECT_ENTITIES],
            target: MoveState.WAITING_FOR_SELECTION,
          },
          ESC: {
            actions: MoveAction.DESELECT_ENTITIES,
            target: MoveState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [MoveAction.INIT_MOVE_TOOL]: () => {
        console.log('activate move tool');
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
      },
      [MoveAction.ENABLE_HELPERS]: () => {
        setShouldDrawHelpers(true);
      },
      [MoveAction.RECORD_START_POINT]: assign(({ event }) => {
        return {
          startPoint: (event as MouseClickEvent).worldClickPoint,
        };
      }),
      [MoveAction.MOVE_SELECTION]: assign(({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[MOVE] Calling move selection without a start point',
          );
        }
        moveSelection(
          context.startPoint as Point,
          (event as MouseClickEvent).worldClickPoint,
        );

        setSelectedEntityIds([]);
        return {
          startPoint: null,
        };
      }),
      [MoveAction.DESELECT_ENTITIES]: assign(() => {
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
        };
      }),
      ...selectToolStateMachine.implementations.actions,
    },
  },
);
