import { Point } from '@flatten-js/core';
import {
  addEntity,
  deleteEntity,
  getActiveToolActor,
  getEntities,
  getGhostHelperEntities,
  getSelectedEntities,
  getSelectedEntityIds,
  setActiveEntity,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
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
import { selectToolStateMachine } from './select-tool.ts';
import { Entity } from '../entities/Entity.ts';
import { compact } from 'es-toolkit';
import { moveEntities } from './move-tool.helpers.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import {
  GUIDE_LINE_COLOR,
  GUIDE_LINE_STYLE,
  GUIDE_LINE_WIDTH,
} from '../App.consts.ts';

export interface MoveContext extends ToolContext {
  startPoint: Point | null;
  originalSelectedEntities: Entity[];
  lastDrawLocation: Point | null;
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
  COPY_SELECTION_BEFORE_MOVE = 'COPY_SELECTION_BEFORE_MOVE',
  DRAW_TEMP_MOVE_ENTITIES = 'DRAW_TEMP_MOVE_ENTITIES',
  MOVE_SELECTION = 'MOVE_SELECTION',
  DESELECT_ENTITIES = 'DESELECT_ENTITIES',
  RESTORE_ORIGINAL_ENTITIES = 'RESTORE_ORIGINAL_ENTITIES',
}

/**
 * Move tool state machine
 * This state machine is responsible for moving entities around the canvas
 * It uses the select tool state machine to select entities to move
 * When the user presses enter, the selected entities are marked for moving
 * The user can then select a start point
 * When the user moves their mouse, the selected entities will be updated to move according to the vector: startpoint => mouse location
 * When the user clicks again, the end point is selected and the entities are moved to the new location
 */
export const moveToolStateMachine = createMachine(
  {
    types: {} as {
      context: MoveContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      originalSelectedEntities: [],
      lastDrawLocation: null,
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
          instructions: 'Select what you want to move, then ENTER',
        },
        invoke: {
          id: 'selectToolInsideTheMoveTool',
          src: selectToolStateMachine,
          onDone: {
            actions: assign(() => {
              console.log('select tool finished selection');
              console.log('actor: ', getActiveToolActor()?.getSnapshot());
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
            actions: [
              MoveAction.RECORD_START_POINT,
              MoveAction.COPY_SELECTION_BEFORE_MOVE,
            ],
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
            actions: [MoveAction.DRAW_TEMP_MOVE_ENTITIES],
          },
          MOUSE_CLICK: {
            actions: [MoveAction.MOVE_SELECTION, MoveAction.DESELECT_ENTITIES],
            target: MoveState.WAITING_FOR_SELECTION,
          },
          ESC: {
            actions: MoveAction.RESTORE_ORIGINAL_ENTITIES,
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
        setAngleGuideOriginPoint(null);
      },
      [MoveAction.ENABLE_HELPERS]: () => {
        setShouldDrawHelpers(true);
      },
      [MoveAction.RECORD_START_POINT]: assign(({ event }) => {
        setAngleGuideOriginPoint((event as MouseClickEvent).worldClickPoint);
        return {
          startPoint: (event as MouseClickEvent).worldClickPoint,
        };
      }),
      [MoveAction.COPY_SELECTION_BEFORE_MOVE]: assign(({ context }) => {
        const selectedEntities = getSelectedEntities();

        // Move the selected entities to the ghost helper entities, so they are drawn on the canvas, but do not interact with the snap points / angle guides
        setGhostHelperEntities(selectedEntities);
        // Remove the selected entities from the regular entity list, so they do not get used for determining snap points / angle guides
        deleteEntity(...selectedEntities);

        // TODO keep a copy of the original entities in the entities list, but set their line color to grey, so the user can see where the entities were before being moved and the original entities also are used for snap points / angle guides

        setSelectedEntityIds([]);
        return {
          startPoint: context.startPoint,
          // Make a copy of the selected entities before moving them, so we can restore them when the user cancels the move action
          originalSelectedEntities: compact(
            selectedEntities.map(entity => entity.clone()),
          ),
        };
      }),
      [MoveAction.DRAW_TEMP_MOVE_ENTITIES]: assign(({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[MOVE] Calling draw temp move line without a start point',
          );
        }

        const endPointTemp = (event as DrawEvent).drawInfo.worldMouseLocation;

        // // Draw a dashed line between the start move point and the current mouse location
        const activeMoveLine = new LineEntity(
          context.startPoint as Point,
          endPointTemp,
        );
        activeMoveLine.lineColor = GUIDE_LINE_COLOR;
        activeMoveLine.lineWidth = GUIDE_LINE_WIDTH;
        activeMoveLine.lineStyle = GUIDE_LINE_STYLE;
        setActiveEntity(activeMoveLine);

        // Draw all selected entities according to translation vector, so the user gets visual feedback of where the entities will be moved
        const lastMoveLocationTemp =
          context.lastDrawLocation || context.startPoint;
        moveEntities(
          getGhostHelperEntities(),
          endPointTemp.x - lastMoveLocationTemp.x,
          endPointTemp.y - lastMoveLocationTemp.y,
        );

        return {
          ...context,
          lastDrawLocation: (event as DrawEvent).drawInfo.worldMouseLocation,
        };
      }),
      [MoveAction.MOVE_SELECTION]: ({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[MOVE] Calling move selection without a start point',
          );
        }

        // Move the entities one final time
        const lastMoveLocationTemp =
          context.lastDrawLocation || context.startPoint;
        const currentEndPoint = (event as MouseClickEvent).worldClickPoint;
        moveEntities(
          getGhostHelperEntities(),
          currentEndPoint.x - lastMoveLocationTemp.x,
          currentEndPoint.y - lastMoveLocationTemp.y,
        );

        // Switch the moved entities back from the ghost helper entities to the real entities
        addEntity(...getGhostHelperEntities());
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
      },
      [MoveAction.DESELECT_ENTITIES]: assign(() => {
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
          originalSelectedEntities: [],
          lastDrawLocation: null,
        };
      }),
      [MoveAction.RESTORE_ORIGINAL_ENTITIES]: assign(({ context }) => {
        const entities = getEntities();
        console.log({ entities });
        addEntity(...context.originalSelectedEntities);
        setGhostHelperEntities([]);
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
          originalSelectedEntities: [],
          lastDrawLocation: null,
        };
      }),
      ...selectToolStateMachine.implementations.actions,
    },
  },
);
