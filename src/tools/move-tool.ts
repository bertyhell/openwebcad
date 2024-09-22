import { Point } from '@flatten-js/core';
import {
  getSelectedEntityIds,
  setActiveEntity,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import {
  DrawEvent,
  MouseClickEvent,
  StateEvent,
  ToolContext,
} from './tool.types.ts';
import { assign, createMachine, sendTo } from 'xstate';
import { moveSelection } from './move-tool.helpers.ts';
import { selectToolStateMachine } from './select-tool.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import {
  GUIDE_LINE_COLOR,
  GUIDE_LINE_STYLE,
  GUIDE_LINE_WIDTH,
} from '../App.consts.ts';

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
  DRAW_TEMP_MOVE_LINE = 'DRAW_TEMP_MOVE_LINE',
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
          target: MoveState.CHECK_SELECTION,
        },
      },
      [MoveState.CHECK_SELECTION]: {
        description: 'Check if there is something selected',
        always: [
          {
            guard: () => {
              console.log(
                'check selection: selected entities length > 0: ',
                getSelectedEntityIds().length > 0,
              );
              return getSelectedEntityIds().length > 0;
            },
            target: MoveState.WAITING_FOR_START_MOVE_POINT,
          },
          {
            guard: () => {
              console.log(
                'check selection: selected entities length === 0: ',
                getSelectedEntityIds().length === 0,
              );
              return getSelectedEntityIds().length === 0;
            },
            target: MoveState.WAITING_FOR_SELECTION,
          },
        ],
      },
      [MoveState.WAITING_FOR_SELECTION]: {
        description: 'Select what you want to move',
        meta: {
          instructions: 'Select what you want to move',
        },
        invoke: {
          id: 'selectToolInsideTheMoveTool',
          src: selectToolStateMachine,
          onDone: {
            actions: assign(() => {
              console.log('select tool finished selection');
              return {
                startPoint: null,
              };
            }),
            target: MoveState.CHECK_SELECTION,
          },
        },
        on: {
          MOUSE_CLICK: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheMoveTool', ({ event }) => {
              return event;
            }),
          },
          ESC: {
            actions: [MoveAction.DESELECT_ENTITIES, MoveAction.INIT_MOVE_TOOL],
          },
          ENTER: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheMoveTool', ({ event }) => {
              return event;
            }),
          },
          DRAW: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheMoveTool', ({ event }) => {
              return event;
            }),
          },
        },
      },
      [MoveState.WAITING_FOR_START_MOVE_POINT]: {
        description: 'Select the start of the move line',
        meta: {
          instructions: 'Select the start of the move line',
        },
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
        meta: {
          instructions: 'Select the end of the move line',
        },
        on: {
          DRAW: {
            actions: [MoveAction.DRAW_TEMP_MOVE_LINE],
          },
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
        setShouldDrawHelpers(false);
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
      [MoveAction.DRAW_TEMP_MOVE_LINE]: assign(({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[MOVE] Calling draw temp move line without a start point',
          );
        }
        const activeMoveLine = new LineEntity(
          context.startPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        activeMoveLine.lineColor = GUIDE_LINE_COLOR;
        activeMoveLine.lineWidth = GUIDE_LINE_WIDTH;
        activeMoveLine.lineStyle = GUIDE_LINE_STYLE;
        setActiveEntity(activeMoveLine);
        return context;
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
