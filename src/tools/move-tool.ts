import { Point } from '@flatten-js/core';
import {
  getSelectedEntityIds,
  setActiveEntity,
  setActiveTool,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import { DrawEvent, KeyboardEscEvent, MouseClickEvent } from './tool.types.ts';
import { assign, createActor, createMachine } from 'xstate';
import { moveSelection } from './move-tool.helpers.ts';

export interface MoveContext {
  startPoint: Point | null;
}

export enum MoveState {
  WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum MoveAction {
  INIT_MOVE_TOOL = 'INIT_MOVE_TOOL',
  ENABLE_HELPERS = 'ENABLE_HELPERS',
  RECORD_START_POINT = 'RECORD_START_POINT',
  MOVE_SELECTION = 'MOVE_SELECTION',
  DESELECT_ENTITIES = 'DESELECT_ENTITIES',
}

const moveToolStateMachine = createMachine(
  {
    types: {} as {
      context: MoveContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      startPoint: null,
    },
    initial: MoveState.WAITING_FOR_SELECTION,
    states: {
      [MoveState.WAITING_FOR_SELECTION]: {
        always: [
          {
            actions: MoveAction.INIT_MOVE_TOOL,
          },
          {
            guard: () => getSelectedEntityIds().length > 0,
            target: MoveState.WAITING_FOR_START_POINT,
          },
        ],
        on: {
          // TODO connect selection state machine here
        },
      },
      [MoveState.WAITING_FOR_START_POINT]: {
        always: {
          actions: MoveAction.ENABLE_HELPERS,
        },
        on: {
          MOUSE_CLICK: {
            actions: MoveAction.RECORD_START_POINT,
            target: MoveState.WAITING_FOR_END_POINT,
          },
          ESC: {
            actions: MoveAction.DESELECT_ENTITIES,
          },
        },
      },
      [MoveState.WAITING_FOR_END_POINT]: {
        on: {
          MOUSE_CLICK: {
            actions: [MoveAction.MOVE_SELECTION, MoveAction.DESELECT_ENTITIES],
            target: MoveState.WAITING_FOR_SELECTION,
          },
        },
      },
    },
  },
  {
    actions: {
      [MoveAction.INIT_MOVE_TOOL]: () => {
        console.log('activate move tool');
        setActiveTool(Tool.Move);
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
    },
  },
);

export const moveToolActor = createActor(moveToolStateMachine);
moveToolActor.subscribe(state => {
  console.log('move tool state:', state.value);
});
