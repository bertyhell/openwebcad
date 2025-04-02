import {Point} from '@flatten-js/core';
import {
  addEntities,
  getActiveLayerId,
  getSelectedEntities,
  getSelectedEntityIds,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import {Tool} from '../tools';
import {DrawEvent, MouseClickEvent, StateEvent, ToolContext,} from './tool.types';
import {assign, createMachine, sendTo} from 'xstate';
import {selectToolStateMachine} from './select-tool';
import {Entity} from '../entities/Entity';
import {compact} from 'es-toolkit';
import {LineEntity} from '../entities/LineEntity';
import {GUIDE_LINE_COLOR, GUIDE_LINE_STYLE, GUIDE_LINE_WIDTH,} from '../App.consts';
import {moveEntities} from './move-tool.helpers';

export interface CopyContext extends ToolContext {
  startPoint: Point | null;
  originalSelectedEntities: Entity[];
  copiedEntities: Entity[];
  lastDrawLocation: Point | null;
}

export enum CopyState {
  INIT = 'INIT',
  CHECK_SELECTION = 'CHECK_SELECTION',
  WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
  WAITING_FOR_START_COPY_POINT = 'WAITING_FOR_START_COPY_POINT',
  WAITING_FOR_END_COPY_POINT = 'WAITING_FOR_END_COPY_POINT',
}

export enum CopyAction {
  INIT_COPY_TOOL = 'INIT_COPY_TOOL',
  ENABLE_HELPERS = 'ENABLE_HELPERS',
  RECORD_START_POINT = 'RECORD_START_POINT',
  COPY_SELECTION_BEFORE_COPY = 'COPY_SELECTION_BEFORE_COPY',
  DRAW_TEMP_COPY_ENTITIES = 'DRAW_TEMP_COPY_ENTITIES',
  COPY_SELECTION = 'COPY_SELECTION',
  DESELECT_ENTITIES = 'DESELECT_ENTITIES',
  RESTORE_ORIGINAL_ENTITIES = 'RESTORE_ORIGINAL_ENTITIES',
}

/**
 * Copy tool state machine
 * This state machine is responsible for copying entities around the canvas
 * It uses the select tool state machine to select entities to copy
 * When the user presses enter, the selected entities are marked for copying
 * The user can then select a start point
 * When the user moves their mouse, the selected entities will be updated to move according to the vector: startpoint => mouse location
 * When the user clicks again, the end point is selected and the entities are copied to the new location
 */
export const copyToolStateMachine = createMachine(
  {
    types: {} as {
      context: CopyContext;
      events: StateEvent;
    },
    context: {
      startPoint: null,
      originalSelectedEntities: [],
      copiedEntities: [],
      lastDrawLocation: null,
      type: Tool.COPY,
    },
    initial: CopyState.INIT,
    states: {
      [CopyState.INIT]: {
        description: 'Initializing the copy tool',
        always: {
          actions: CopyAction.INIT_COPY_TOOL,
          target: CopyState.CHECK_SELECTION,
        },
      },
      [CopyState.CHECK_SELECTION]: {
        description: 'Check if there is something selected',
        always: [
          {
            guard: () => {
              return getSelectedEntityIds().length > 0;
            },
            target: CopyState.WAITING_FOR_START_COPY_POINT,
          },
          {
            guard: () => {
              return getSelectedEntityIds().length === 0;
            },
            target: CopyState.WAITING_FOR_SELECTION,
          },
        ],
      },
      [CopyState.WAITING_FOR_SELECTION]: {
        description: 'Select what you want to copy',
        meta: {
          instructions: 'Select what you want to copy, then ENTER',
        },
        invoke: {
          id: 'selectToolInsideTheCopyTool',
          src: selectToolStateMachine,
          onDone: {
            actions: assign(() => {
              return {
                startPoint: null,
              };
            }),
            target: CopyState.CHECK_SELECTION,
          },
        },
        on: {
          MOUSE_CLICK: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheCopyTool', ({ event }) => {
              return event;
            }),
          },
          ESC: {
            actions: [CopyAction.DESELECT_ENTITIES, CopyAction.INIT_COPY_TOOL],
          },
          ENTER: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheCopyTool', ({ event }) => {
              return event;
            }),
          },
          DRAW: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheCopyTool', ({ event }) => {
              return event;
            }),
          },
        },
      },
      [CopyState.WAITING_FOR_START_COPY_POINT]: {
        description: 'Select the start of the copy line',
        meta: {
          instructions: 'Select the start of the copy line',
        },
        always: {
          actions: CopyAction.ENABLE_HELPERS,
        },
        on: {
          MOUSE_CLICK: {
            actions: [
              CopyAction.RECORD_START_POINT,
              CopyAction.COPY_SELECTION_BEFORE_COPY,
            ],
            target: CopyState.WAITING_FOR_END_COPY_POINT,
          },
          ESC: {
            actions: CopyAction.DESELECT_ENTITIES,
            target: CopyState.INIT,
          },
        },
      },
      [CopyState.WAITING_FOR_END_COPY_POINT]: {
        description: 'Select the end of the copy line',
        meta: {
          instructions: 'Select the end of the copy line',
        },
        on: {
          DRAW: {
            actions: [CopyAction.DRAW_TEMP_COPY_ENTITIES],
          },
          MOUSE_CLICK: {
            actions: [CopyAction.COPY_SELECTION],
            target: CopyState.WAITING_FOR_END_COPY_POINT,
          },
          ESC: {
            actions: CopyAction.DESELECT_ENTITIES,
            target: CopyState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [CopyAction.INIT_COPY_TOOL]: assign(() => {
        setShouldDrawHelpers(false);
        setGhostHelperEntities([]);
        setAngleGuideOriginPoint(null);
        return {
          startPoint: null,
          originalSelectedEntities: [],
          copiedEntities: [],
          lastDrawLocation: null,
        };
      }),
      [CopyAction.ENABLE_HELPERS]: () => {
        setShouldDrawHelpers(true);
      },
      [CopyAction.RECORD_START_POINT]: assign(({ event }) => {
        setAngleGuideOriginPoint((event as MouseClickEvent).worldMouseLocation);
        return {
          startPoint: (event as MouseClickEvent).worldMouseLocation,
        };
      }),
      [CopyAction.COPY_SELECTION_BEFORE_COPY]: assign(({ context }) => {
        const selectedEntities = getSelectedEntities();

        // Copy the selected entities to the ghost helper entities, so they are drawn on the canvas, but do not interact with the snap points / angle guides
        setGhostHelperEntities(selectedEntities);

        // TODO keep a copy of the original entities in the entities list, but set their line color to grey, so the user can see where the entities were before being copied and the original entities also are used for snap points / angle guides

        setSelectedEntityIds([]);
        return {
          startPoint: context.startPoint,
          // Make a copy of the selected entities before copying them, so we can restore them when the user cancels the copy action
          originalSelectedEntities: compact(
            selectedEntities.map(entity => entity.clone()),
          ),
          copiedEntities: selectedEntities,
        };
      }),
      [CopyAction.DRAW_TEMP_COPY_ENTITIES]: ({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[COPY] Calling draw temp copy line without a start point',
          );
        }

        const endPointTemp = (
          event as DrawEvent
        ).drawController.getWorldMouseLocation();

        // Copy the entities to the new location
        // Draw all selected entities according to translation vector, so the user gets visual feedback of where the entities will be copied;
        const movedEntities = context.originalSelectedEntities.map(entity =>
          entity.clone(),
        );
        moveEntities(
          movedEntities,
          endPointTemp.x - context.startPoint.x,
          endPointTemp.y - context.startPoint.y,
        );

        // // Draw a dashed line between the start copy point and the current mouse location
        const activeCopyLine = new LineEntity(
            getActiveLayerId(),
            context.startPoint as Point,
          endPointTemp,
        );
        activeCopyLine.lineColor = GUIDE_LINE_COLOR;
        activeCopyLine.lineWidth = GUIDE_LINE_WIDTH;
        activeCopyLine.lineDash = GUIDE_LINE_STYLE;
        setGhostHelperEntities([activeCopyLine, ...movedEntities]);
      },
      [CopyAction.COPY_SELECTION]: ({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[COPY] Calling copy selection without a start point',
          );
        }

        // Copy the entities one final time
        const currentEndPoint = (event as MouseClickEvent).worldMouseLocation;
        const copiedEntities  = context.originalSelectedEntities.map(entity =>
            entity.clone(),
        );
        moveEntities(
            copiedEntities,
          currentEndPoint.x - context.startPoint.x,
          currentEndPoint.y - context.startPoint.y,
        );

        // Switch the copied entities back from the ghost helper entities to the real entities
        addEntities([...context.originalSelectedEntities, ...copiedEntities], true);
      },
      [CopyAction.DESELECT_ENTITIES]: assign(() => {
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
          originalSelectedEntities: [],
          lastDrawLocation: null,
        };
      }),
      [CopyAction.RESTORE_ORIGINAL_ENTITIES]: assign(({ context }) => {
        addEntities(context.originalSelectedEntities, false); // This should already be the last state of the undo stack
        setGhostHelperEntities([]);
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
