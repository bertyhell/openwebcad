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
import { rotateEntities } from './rotate-tool.helpers';

export interface RotateContext extends ToolContext {
  rotationOrigin: Point | null;
  angleStartPoint: Point | null;
  originalSelectedEntities: Entity[];
}

export enum RotateState {
  INIT = 'INIT',
  CHECK_SELECTION = 'CHECK_SELECTION',
  WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
  WAITING_FOR_ROTATION_ORIGIN = 'WAITING_FOR_ROTATION_ORIGIN',
  WAITING_FOR_ANGLE_START_POINT = 'WAITING_FOR_ANGLE_START_POINT',
  WAITING_FOR_ANGLE_END_POINT = 'WAITING_FOR_ANGLE_END_POINT',
}

export enum RotateAction {
  INIT_ROTATE_TOOL = 'INIT_ROTATE_TOOL',
  ENABLE_HELPERS = 'ENABLE_HELPERS',
  RECORD_ROTATION_ORIGIN = 'RECORD_ROTATION_ORIGIN',
  RECORD_ROTATION_ANGLE_START_POINT = 'RECORD_ROTATION_ANGLE_START_POINT',
  COPY_SELECTION_BEFORE_ROTATE = 'COPY_SELECTION_BEFORE_ROTATE',
  DRAW_TEMP_ROTATE_ENTITIES = 'DRAW_TEMP_ROTATE_ENTITIES',
  ROTATE_SELECTION = 'ROTATE_SELECTION',
  DESELECT_ENTITIES = 'DESELECT_ENTITIES',
  RESTORE_ORIGINAL_ENTITIES = 'RESTORE_ORIGINAL_ENTITIES',
}

/**
 * Rotate tool state machine
 * This state machine is responsible for rotating entities around a point (rotation origin) by a certain angle
 * It uses the select tool state machine to select entities to rotate
 * When the user presses enter, the selected entities are marked for rotating
 * The user can then select a rotation origin point
 * The user can then select the start point of the rotation angle
 * When the user moves their mouse, the selected entities will be updated to rotate according to the angle: start angle point => rotation origin => mouse location
 * When the user clicks again, the angle is locked in and the entities are rotated around the rotation origin
 */
export const rotateToolStateMachine = createMachine(
  {
    types: {} as {
      context: RotateContext;
      events: StateEvent;
    },
    context: {
      rotationOrigin: null,
      angleStartPoint: null,
      originalSelectedEntities: [],
      type: Tool.ROTATE,
    },
    initial: RotateState.INIT,
    states: {
      [RotateState.INIT]: {
        description: 'Initializing the rotate tool',
        always: {
          actions: RotateAction.INIT_ROTATE_TOOL,
          target: RotateState.CHECK_SELECTION,
        },
      },
      [RotateState.CHECK_SELECTION]: {
        description: 'Check if there is something selected',
        always: [
          {
            guard: () => {
              return getSelectedEntityIds().length > 0;
            },
            target: RotateState.WAITING_FOR_ROTATION_ORIGIN,
          },
          {
            guard: () => {
              return getSelectedEntityIds().length === 0;
            },
            target: RotateState.WAITING_FOR_SELECTION,
          },
        ],
      },
      [RotateState.WAITING_FOR_SELECTION]: {
        description: 'Select what you want to rotate',
        meta: {
          instructions: 'Select what you want to rotate, then ENTER',
        },
        invoke: {
          id: 'selectToolInsideTheRotateTool',
          src: selectToolStateMachine,
          onDone: {
            actions: assign(({ context }) => {
              return {
                ...context,
              };
            }),
            target: RotateState.CHECK_SELECTION,
          },
        },
        on: {
          MOUSE_CLICK: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheRotateTool', ({ event }) => {
              return event;
            }),
          },
          ESC: {
            actions: [
              RotateAction.DESELECT_ENTITIES,
              RotateAction.INIT_ROTATE_TOOL,
            ],
          },
          ENTER: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheRotateTool', ({ event }) => {
              return event;
            }),
          },
          DRAW: {
            // Forward the event to the select tool
            actions: sendTo('selectToolInsideTheRotateTool', ({ event }) => {
              return event;
            }),
          },
        },
      },
      [RotateState.WAITING_FOR_ROTATION_ORIGIN]: {
        description: 'Select the origin of the rotate operation',
        meta: {
          instructions: 'Select the origin of the rotate operation',
        },
        always: {
          actions: RotateAction.ENABLE_HELPERS,
        },
        on: {
          MOUSE_CLICK: {
            actions: [RotateAction.RECORD_ROTATION_ORIGIN],
            target: RotateState.WAITING_FOR_ANGLE_START_POINT,
          },
          ESC: {
            actions: RotateAction.DESELECT_ENTITIES,
            target: RotateState.INIT,
          },
        },
      },
      [RotateState.WAITING_FOR_ANGLE_START_POINT]: {
        description: 'Select the end of the base rotate line',
        meta: {
          instructions: 'Select the end of the base rotate line',
        },
        on: {
          MOUSE_CLICK: {
            actions: [
              RotateAction.RECORD_ROTATION_ANGLE_START_POINT,
              RotateAction.COPY_SELECTION_BEFORE_ROTATE,
            ],
            target: RotateState.WAITING_FOR_ANGLE_END_POINT,
          },
          ESC: {
            actions: RotateAction.RESTORE_ORIGINAL_ENTITIES,
            target: RotateState.INIT,
          },
        },
      },
      [RotateState.WAITING_FOR_ANGLE_END_POINT]: {
        description: 'Select the end of the rotate line',
        meta: {
          instructions: 'Select the end of the rotate line',
        },
        on: {
          DRAW: {
            actions: [RotateAction.DRAW_TEMP_ROTATE_ENTITIES],
          },
          MOUSE_CLICK: {
            actions: [
              RotateAction.ROTATE_SELECTION,
              RotateAction.DESELECT_ENTITIES,
            ],
            target: RotateState.WAITING_FOR_SELECTION,
          },
          ESC: {
            actions: RotateAction.RESTORE_ORIGINAL_ENTITIES,
            target: RotateState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [RotateAction.INIT_ROTATE_TOOL]: () => {
        setShouldDrawHelpers(false);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        setAngleGuideOriginPoint(null);
      },
      [RotateAction.ENABLE_HELPERS]: () => {
        setShouldDrawHelpers(true);
      },
      [RotateAction.RECORD_ROTATION_ORIGIN]: assign(
        ({ context, event }): RotateContext => {
          setAngleGuideOriginPoint(
            (event as MouseClickEvent).worldMouseLocation,
          );
          return {
            ...context,
            rotationOrigin: (event as MouseClickEvent).worldMouseLocation,
          };
        },
      ),
      [RotateAction.RECORD_ROTATION_ANGLE_START_POINT]: assign(
        ({ context, event }): RotateContext => {
          return {
            ...context,
            angleStartPoint: (event as MouseClickEvent).worldMouseLocation,
          };
        },
      ),
      [RotateAction.COPY_SELECTION_BEFORE_ROTATE]: assign(
        ({ context }): RotateContext => {
          const selectedEntities = getSelectedEntities();

          // Rotate the selected entities to the ghost helper entities, so they are drawn on the canvas, but do not interact with the snap points / angle guides
          setGhostHelperEntities(selectedEntities);
          // Re-rotate the selected entities from the regular entity list, so they do not get used for determining snap points / angle guides
          deleteEntities(selectedEntities, false);

          // TODO keep a copy of the original entities in the entities list, but set their line color to grey, so the user can see where the entities were before being rotated and the original entities also are used for snap points / angle guides

          setSelectedEntityIds([]);
          return {
            ...context,
            // Make a copy of the selected entities before rotating them, so we can restore them when the user cancels the rotate action
            originalSelectedEntities: compact(
              selectedEntities.map(entity => entity.clone()),
            ),
          };
        },
      ),
      [RotateAction.DRAW_TEMP_ROTATE_ENTITIES]: ({ context, event }) => {
        if (!context.rotationOrigin || !context.angleStartPoint) {
          throw new Error(
            '[ROTATE] Calling draw temp rotate entities without a base start point or base end point',
          );
        }

        const angleEndpoint = (
          event as DrawEvent
        ).drawController.getWorldMouseLocation();

        // Draw all selected entities according to rotate vector, so the user gets visual feedback of where the entities will be end up after rotating
        const rotatedEntities = compact(
          context.originalSelectedEntities.map(entity => entity.clone()),
        );
        rotateEntities(
          rotatedEntities,
          context.rotationOrigin,
          context.angleStartPoint,
          angleEndpoint,
        );

        setGhostHelperEntities(rotatedEntities);
      },
      [RotateAction.ROTATE_SELECTION]: ({ context, event }) => {
        if (!context.rotationOrigin || !context.angleStartPoint) {
          throw new Error(
            '[ROTATE] Calling rotate selection without some rotate vector endpoints',
          );
        }
        const angleEndpoint = (event as MouseClickEvent).worldMouseLocation;

        // Rotate the entities one final time
        const rotatedEntities = compact(
          context.originalSelectedEntities.map(entity => entity.clone()),
        );
        rotateEntities(
          rotatedEntities,
          context.rotationOrigin,
          context.angleStartPoint,
          angleEndpoint,
        );

        // Switch the rotated entities back from the ghost helper entities to the real entities
        addEntities(rotatedEntities, true);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
      },
      [RotateAction.DESELECT_ENTITIES]: assign(({ context }): RotateContext => {
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        return {
          ...context,
          rotationOrigin: null,
          angleStartPoint: null,
          originalSelectedEntities: [],
        };
      }),
      [RotateAction.RESTORE_ORIGINAL_ENTITIES]: assign(
        ({ context }): RotateContext => {
          addEntities(context.originalSelectedEntities, false); // This should already be the last state on the undo stack
          setGhostHelperEntities([]);
          setSelectedEntityIds([]);
          return {
            ...context,
            rotationOrigin: null,
            angleStartPoint: null,
            originalSelectedEntities: [],
          };
        },
      ),
      ...selectToolStateMachine.implementations.actions,
    },
  },
);
