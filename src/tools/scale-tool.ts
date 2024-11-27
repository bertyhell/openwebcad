import { Point } from '@flatten-js/core';
import {
  addEntities,
  deleteEntities,
  getSelectedEntities,
  getSelectedEntityIds,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import {
  DrawEvent,
  MouseClickEvent,
  StateEvent,
  ToolContext,
} from './tool.types';
import { assign, createMachine, sendTo } from 'xstate';
import { selectToolStateMachine } from './select-tool';
import { Entity } from '../entities/Entity';
import { compact } from 'es-toolkit';
import { scaleEntities } from './scale-tool.helpers';

export interface ScaleContext extends ToolContext {
  baseVectorStartPoint: Point | null;
  baseVectorEndPoint: Point | null;
  scaleVectorEndPoint: Point | null;
  originalSelectedEntities: Entity[];
}

export enum ScaleState {
  INIT = 'INIT',
  CHECK_SELECTION = 'CHECK_SELECTION',
  WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
  WAITING_FOR_BASE_VECTOR_START_POINT = 'WAITING_FOR_BASE_VECTOR_START_POINT',
  WAITING_FOR_BASE_VECTOR_END_POINT = 'WAITING_FOR_BASE_VECTOR_END_POINT',
  WAITING_FOR_SCALE_VECTOR_END_POINT = 'WAITING_FOR_SCALE_VECTOR_END_POINT',
}

export enum ScaleAction {
  INIT_SCALE_TOOL = 'INIT_SCALE_TOOL',
  ENABLE_HELPERS = 'ENABLE_HELPERS',
  RECORD_BASE_VECTOR_START_POINT = 'RECORD_BASE_VECTOR_START_POINT',
  RECORD_BASE_VECTOR_END_POINT = 'RECORD_BASE_VECTOR_END_POINT',
  COPY_SELECTION_BEFORE_SCALE = 'COPY_SELECTION_BEFORE_SCALE',
  DRAW_TEMP_SCALE_ENTITIES = 'DRAW_TEMP_SCALE_ENTITIES',
  SCALE_SELECTION = 'SCALE_SELECTION',
  DESELECT_ENTITIES = 'DESELECT_ENTITIES',
  RESTORE_ORIGINAL_ENTITIES = 'RESTORE_ORIGINAL_ENTITIES',
}

/**
 * Scale tool state machine
 * This state machine is responsible for scaling entities from a base vector to  a certain scale vector
 * It uses the select tool state machine to select entities to scale
 * When the user presses enter, the selected entities are marked for scaling
 * The user can then select a base scale vector start point
 * The user can then select the base scale vector end point
 * When the user moves their mouse, the selected entities will be updated to scale according to the vector: base vector => scale vector from start point to mouse location
 * When the user clicks again, the scale vector end point is selected and the entities are scaled according to the scale vector
 */
export const scaleToolStateMachine = createMachine(
  {
    types: {} as {
      context: ScaleContext;
      events: StateEvent;
    },
    context: {
      baseVectorStartPoint: null,
      baseVectorEndPoint: null,
      scaleVectorEndPoint: null,
      originalSelectedEntities: [],
      type: Tool.SCALE,
    },
    initial: ScaleState.INIT,
    states: {
      [ScaleState.INIT]: {
        description: 'Initializing the scale tool',
        always: {
          actions: ScaleAction.INIT_SCALE_TOOL,
          target: ScaleState.CHECK_SELECTION,
        },
      },
      [ScaleState.CHECK_SELECTION]: {
        description: 'Check if there is something selected',
        always: [
          {
            guard: () => {
              return getSelectedEntityIds().length > 0;
            },
            target: ScaleState.WAITING_FOR_BASE_VECTOR_START_POINT,
          },
          {
            guard: () => {
              return getSelectedEntityIds().length === 0;
            },
            target: ScaleState.WAITING_FOR_SELECTION,
          },
        ],
      },
      [ScaleState.WAITING_FOR_SELECTION]: {
        description: 'Select what you want to scale',
        meta: {
          instructions: 'Select what you want to scale, then ENTER',
        },
        invoke: {
          id: 'selectToolInsideTheScaleTool',
          src: selectToolStateMachine,
          onDone: {
            actions: assign(() => {
              return {
                baseVectorStartPoint: null,
                baseVectorEndPoint: null,
                scaleVectorEndPoint: null,
                originalSelectedEntities: [],
              };
            }),
            target: ScaleState.CHECK_SELECTION,
          },
        },
        on: {
          MOUSE_CLICK: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheScaleTool', ({ event }) => {
              return event;
            }),
          },
          ESC: {
            actions: [
              ScaleAction.DESELECT_ENTITIES,
              ScaleAction.INIT_SCALE_TOOL,
            ],
          },
          ENTER: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheScaleTool', ({ event }) => {
              return event;
            }),
          },
          DRAW: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheScaleTool', ({ event }) => {
              return event;
            }),
          },
        },
      },
      [ScaleState.WAITING_FOR_BASE_VECTOR_START_POINT]: {
        description: 'Select the origin of the scale operation',
        meta: {
          instructions: 'Select the origin of the scale operation',
        },
        always: {
          actions: ScaleAction.ENABLE_HELPERS,
        },
        on: {
          MOUSE_CLICK: {
            actions: [ScaleAction.RECORD_BASE_VECTOR_START_POINT],
            target: ScaleState.WAITING_FOR_BASE_VECTOR_END_POINT,
          },
          ESC: {
            actions: ScaleAction.DESELECT_ENTITIES,
            target: ScaleState.INIT,
          },
        },
      },
      [ScaleState.WAITING_FOR_BASE_VECTOR_END_POINT]: {
        description: 'Select the end of the base scale line',
        meta: {
          instructions: 'Select the end of the base scale line',
        },
        on: {
          MOUSE_CLICK: {
            actions: [
              ScaleAction.RECORD_BASE_VECTOR_END_POINT,
              ScaleAction.COPY_SELECTION_BEFORE_SCALE,
            ],
            target: ScaleState.WAITING_FOR_SCALE_VECTOR_END_POINT,
          },
          ESC: {
            actions: ScaleAction.RESTORE_ORIGINAL_ENTITIES,
            target: ScaleState.INIT,
          },
        },
      },
      [ScaleState.WAITING_FOR_SCALE_VECTOR_END_POINT]: {
        description: 'Select the end of the scale line',
        meta: {
          instructions: 'Select the end of the scale line',
        },
        on: {
          DRAW: {
            actions: [ScaleAction.DRAW_TEMP_SCALE_ENTITIES],
          },
          MOUSE_CLICK: {
            actions: [
              ScaleAction.SCALE_SELECTION,
              ScaleAction.DESELECT_ENTITIES,
            ],
            target: ScaleState.WAITING_FOR_SELECTION,
          },
          ESC: {
            actions: ScaleAction.RESTORE_ORIGINAL_ENTITIES,
            target: ScaleState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [ScaleAction.INIT_SCALE_TOOL]: () => {
        setShouldDrawHelpers(false);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        setAngleGuideOriginPoint(null);
      },
      [ScaleAction.ENABLE_HELPERS]: () => {
        setShouldDrawHelpers(true);
      },
      [ScaleAction.RECORD_BASE_VECTOR_START_POINT]: assign(
        ({ context, event }) => {
          setAngleGuideOriginPoint(
            (event as MouseClickEvent).worldMouseLocation,
          );
          return {
            ...context,
            baseVectorStartPoint: (event as MouseClickEvent).worldMouseLocation,
          };
        },
      ),
      [ScaleAction.RECORD_BASE_VECTOR_END_POINT]: assign(
        ({ context, event }) => {
          return {
            ...context,
            baseVectorEndPoint: (event as MouseClickEvent).worldMouseLocation,
          };
        },
      ),
      [ScaleAction.COPY_SELECTION_BEFORE_SCALE]: assign(({ context }) => {
        const selectedEntities = getSelectedEntities();

        // Scale the selected entities to the ghost helper entities, so they are drawn on the canvas, but do not interact with the snap points / angle guides
        setGhostHelperEntities(selectedEntities);
        // Rescale the selected entities from the regular entity list, so they do not get used for determining snap points / angle guides
        deleteEntities(selectedEntities, false);

        // TODO keep a copy of the original entities in the entities list, but set their line color to grey, so the user can see where the entities were before being scaled and the original entities also are used for snap points / angle guides

        setSelectedEntityIds([]);
        return {
          ...context,
          // Make a copy of the selected entities before scaling them, so we can restore them when the user cancels the scale action
          originalSelectedEntities: compact(
            selectedEntities.map(entity => entity.clone()),
          ),
        };
      }),
      [ScaleAction.DRAW_TEMP_SCALE_ENTITIES]: ({ context, event }) => {
        if (!context.baseVectorStartPoint || !context.baseVectorEndPoint) {
          throw new Error(
            '[SCALE] Calling draw temp scale entities without a base start point or base end point',
          );
        }

        const scaleVectorEndPointTemp = (
          event as DrawEvent
        ).drawController.getWorldMouseLocation();

        // Draw all selected entities according to scale vector, so the user gets visual feedback of where the entities will be end up after scaling
        const scaledEntities = compact(
          context.originalSelectedEntities.map(entity => entity.clone()),
        );
        scaleEntities(
          scaledEntities,
          context.baseVectorStartPoint,
          context.baseVectorEndPoint,
          scaleVectorEndPointTemp,
        );

        setGhostHelperEntities(scaledEntities);
      },
      [ScaleAction.SCALE_SELECTION]: ({ context, event }) => {
        if (!context.baseVectorStartPoint || !context.baseVectorEndPoint) {
          throw new Error(
            '[SCALE] Calling scale selection without some scale vector endpoints',
          );
        }
        const scaleVectorEndPoint = (event as MouseClickEvent)
          .worldMouseLocation;

        // Scale the entities one final time
        const scaledEntities = compact(
          context.originalSelectedEntities.map(entity => entity.clone()),
        );
        scaleEntities(
          scaledEntities,
          context.baseVectorStartPoint,
          context.baseVectorEndPoint,
          scaleVectorEndPoint,
        );

        // Switch the scaled entities back from the ghost helper entities to the real entities
        addEntities(scaledEntities, true);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
      },
      [ScaleAction.DESELECT_ENTITIES]: assign(() => {
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
          originalSelectedEntities: [],
          lastDrawLocation: null,
        };
      }),
      [ScaleAction.RESTORE_ORIGINAL_ENTITIES]: assign(({ context }) => {
        addEntities(context.originalSelectedEntities, false); // This should already be the last state on the undo stack
        setGhostHelperEntities([]);
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
