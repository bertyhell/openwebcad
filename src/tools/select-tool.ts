import { Box, Point } from '@flatten-js/core';
import { SelectionRectangleEntity } from '../entities/SelectionRectangleEntity.ts';
import { findClosestEntity } from '../helpers/find-closest-entity.ts';
import {EPSILON, HIGHLIGHT_ENTITY_DISTANCE} from '../App.consts.ts';
import {
  addEntity,
  getActiveEntity, getActiveSelectionRect,
  getEntities,
  getSelectedEntityIds,
  isEntitySelected,
  setActiveEntity,
  setActiveTool,
  setHighlightedEntityIds,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { compact } from 'es-toolkit';
import {
  DrawEvent,
  KeyboardEscEvent,
  MouseClickEvent,
  ToolHandler,
} from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';
import {RectangleEntity} from "../entities/RectangleEntity.ts";

export interface SelectContext {
  startPoint: Point | null;
}

export enum SelectState {
  WAITING_FOR_FIRST_SELECT_POINT = 'WAITING_FOR_FIRST_SELECT_POINT',
  WAITING_FOR_SECOND_SELECT_POINT = 'WAITING_FOR_SECOND_SELECT_POINT',
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
      waitingForFirstSelectPoint: {
        always: {
          actions: 'initSelectTool',
        },
        on: {
          MOUSE_CLICK: {
            actions: 'handleFirstSelectPoint',
            target: SelectState.WAITING_FOR_SECOND_SELECT_POINT,
          },
          ESC: {
            actions: 'deselectAll',
          },
        },
      },
      waitingForSecondSelectPoint: {
        on: {
          DRAW: {
            actions: 'drawTempSelect',
          },
          MOUSE_CLICK: {
            actions: 'drawFinalSelect',
            target: SelectState.WAITING_FOR_SECOND_SELECT_POINT,
          },
          ESC: {
            actions: 'resetActiveEntity',
            target: SelectState.WAITING_FOR_FIRST_SELECT_POINT,
          },
        },
      },
    },
  },
  {
    actions: {
      initSelectTool: () => {
        console.log('activate select tool');
        setActiveTool(Tool.Select);
        setShouldDrawHelpers(false);
        setActiveEntity(null);
      },
      deselectAll: assign(() => {
        setSelectedEntityIds([]);
        return {
          startPoint: null,
        };
      }),
      handleFirstSelectPoint: assign(({ context, event }) => {
        return handleFirstSelectionPoint(context, event);
      }),
      handleSecondSelectPoint: assign(({ context, event }) => {
        return handleSecondSelectionPoint(context, event);
      }),
      drawTempSelect: ({ context, event }) => {
        console.log('drawTempSelect', { context, event });

        const activeSelect = new SelectEntity(
          context.startPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        activeSelect.selectColor = getActiveSelectColor();
        activeSelect.selectWidth = getActiveSelectWidth();
        setActiveEntity(activeSelect);
      },
      drawFinalSelect: assign(({ context, event }) => {
        console.log('drawFinalSelect', { context, event });
        const endPoint = (event as MouseClickEvent).worldClickPoint;
        const activeSelect = new SelectEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeSelect.selectColor = getActiveSelectColor();
        activeSelect.selectWidth = getActiveSelectWidth();
        addEntity(activeSelect);

        // Keep drawing from the last point
        setActiveEntity(new SelectEntity(endPoint));
        return {
          startPoint: endPoint,
        };
      }),
      resetActiveEntity: assign(() => {
        setActiveEntity(null);
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
selectToolActor.start();

function handleFirstSelectionPoint(
  _: SelectContext,
  event: MouseClickEvent,
): SelectContext {
  const closestEntityInfo = findClosestEntity(
    event.worldClickPoint,
    getEntities(),
  );

  // Mouse is close to entity and is not dragging a rectangle
  if (
    closestEntityInfo &&
    closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE
  ) {
    // Select the entity close to the mouse
    const closestEntity = closestEntityInfo.entity;
    console.log('selecting entity close to the mouse: ', closestEntity);
    if (!event.holdingCtrl && !event.holdingShift) {
      setSelectedEntityIds([closestEntity.id]);
    } else if (event.holdingCtrl) {
      // ctrl => toggle selection
      if (isEntitySelected(closestEntity)) {
        // Remove the entity from the selection
        setSelectedEntityIds(
          getSelectedEntityIds().filter(id => id !== closestEntity.id),
        );
      } else {
        // Add the entity to the selection
        setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
      }
    } else {
      // shift => add to selection
      setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
    }
    return {
      startPoint: null,
    };
  }

  // No elements are close to the mouse and no selection dragging is in progress
  console.log('Start a new selection rectangle drag');
  // Start a new selection rectangle drag
  return {
    startPoint: event.worldClickPoint,
  };
}

function handleSecondSelectionPoint(
  context: SelectContext,
  event: MouseClickEvent,
): SelectContext {
  if (!context.startPoint) {
    // Assert startPoint
    throw new Error('[SELECT] Got into second selection point state without start point being set');
  }
  // Finish the selection
  console.log('Finish selection: ', getActiveSelectionRect());
  const intersectionSelection =
    getActiveSelectionRect().isIntersectionSelection();
  const newSelectedEntityIds: string[] = compact(
    getEntities().map((entity): string | null => {
      if (intersectionSelection) {
        if (
          entity.intersectsWithBox(
            activeSelectionRectangle.getBoundingBox() as Box,
          ) ||
          entity.isContainedInBox(
            activeSelectionRectangle.getBoundingBox() as Box,
          )
        ) {
          if (holdingCtrl) {
            if (isEntitySelected(entity)) {
              return null;
            } else {
              return entity.id;
            }
          } else {
            return entity.id;
          }
        }
      } else {
        if (
          entity.isContainedInBox(
            activeSelectionRectangle.getBoundingBox() as Box,
          )
        ) {
          if (holdingCtrl) {
            if (isEntitySelected(entity)) {
              return null;
            } else {
              return entity.id;
            }
          } else {
            return entity.id;
          }
        }
      }
      return null;
    }),
  );
  setSelectedEntityIds(newSelectedEntityIds);
}

export const selectToolHandler: ToolHandler = {
  handleToolActivate: () => {
    setActiveTool(Tool.Select);
    setShouldDrawHelpers(false);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (
    worldClickPoint: Point,
    holdingCtrl: boolean,
    holdingShift: boolean,
  ) => {
    handleSelectToolClick(worldClickPoint, holdingCtrl, holdingShift);
  },

  handleToolTypedCommand: (command: string) => {
    console.log('select tool typed command:', command);
  },
};

function handleSelectToolClick(
  worldClickPoint: Point,
  holdingCtrl: boolean,
  holdingShift: boolean,
) {
  const activeEntity = getActiveEntity();

  let activeSelectionRectangle: SelectionRectangleEntity | null = null;
  if (activeEntity instanceof SelectionRectangleEntity) {
    activeSelectionRectangle = activeEntity as SelectionRectangleEntity;
  }

  const closestEntityInfo = findClosestEntity(worldClickPoint, getEntities());

  // Mouse is close to entity and is not dragging a rectangle
  if (
    closestEntityInfo &&
    closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE &&
    !activeSelectionRectangle
  ) {
    // Select the entity close to the mouse
    const closestEntity = closestEntityInfo.entity;
    console.log('selecting entity close to the mouse: ', closestEntity);
    if (!holdingCtrl && !holdingShift) {
      setSelectedEntityIds([closestEntity.id]);
    } else if (holdingCtrl) {
      // ctrl => toggle selection
      if (isEntitySelected(closestEntity)) {
        // Remove the entity from the selection
        setSelectedEntityIds(
          getSelectedEntityIds().filter(id => id !== closestEntity.id),
        );
      } else {
        // Add the entity to the selection
        setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
      }
    } else {
      // shift => add to selection
      setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
    }
    return;
  }

  // No elements are close to the mouse and no selection dragging is in progress
  if (!activeSelectionRectangle) {
    console.log(
      'Start a new selection rectangle drag: ',
      activeSelectionRectangle,
    );
    // Start a new selection rectangle drag
    activeSelectionRectangle = new SelectionRectangleEntity();
    setActiveEntity(activeSelectionRectangle); // TODO make selection a separate concept from entities
  }

  const completed = activeSelectionRectangle.send(
    new Point(worldClickPoint.x, worldClickPoint.y),
  );

  setHighlightedEntityIds([]);
  if (completed) {
    // Finish the selection
    console.log('Finish selection: ', activeSelectionRectangle);
    const intersectionSelection =
      activeSelectionRectangle.isIntersectionSelection();
    const newSelectedEntityIds: string[] = compact(
      getEntities().map((entity): string | null => {
        if (intersectionSelection) {
          if (
            entity.intersectsWithBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            ) ||
            entity.isContainedInBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            )
          ) {
            if (holdingCtrl) {
              if (isEntitySelected(entity)) {
                return null;
              } else {
                return entity.id;
              }
            } else {
              return entity.id;
            }
          }
        } else {
          if (
            entity.isContainedInBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            )
          ) {
            if (holdingCtrl) {
              if (isEntitySelected(entity)) {
                return null;
              } else {
                return entity.id;
              }
            } else {
              return entity.id;
            }
          }
        }
        return null;
      }),
    );
    setSelectedEntityIds(newSelectedEntityIds);

    console.log('Set active entity to null');
    setActiveEntity(null);
  }
}


/**
 * Selections to the left of the start point are intersection selections (green), and everything intersecting with the selection rectangle will be selected
 * SElections to the right of the start point are normal selections (blue), and only the entities fully inside the selection rectangle will be selected
 */
function isIntersectionSelection(rectangleEntity: RectangleEntity, startPoint: Point): boolean {
  if (!rectangleEntity.getShape() || !startPoint) {
    return false;
  }
  return Math.abs(startPoint.x - rectangleEntity.rectangle?.xmin) > EPSILON;
}