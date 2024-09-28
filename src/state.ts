import { Entity } from './entities/Entity.ts';
import { Point } from '@flatten-js/core';
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import {
  HoverPoint,
  HtmlEvent,
  SnapPoint,
  StateMetaData,
} from './App.types.ts';
import { createStack, StateVariable, UndoState } from './helpers/undo-stack.ts';
import { isEqual } from 'es-toolkit';
import { RectangleEntity } from './entities/RectangleEntity.ts';
import { Actor, MachineSnapshot } from 'xstate';
import { Tool } from './tools.ts';

// state variables
/**
 * Width and height of the canvas
 */
let canvasSize = new Point(0, 0);

/**
 * Canvas element
 */
let canvas: HTMLCanvasElement | null = null;

/**
 * Canvas 2d context used for drawing on the canvas
 */
let context: CanvasRenderingContext2D | null = null;

/**
 * Location of the mouse on the screen
 */
let screenMouseLocation = new Point(0, 0);

/**
 * Active tool xstate actor
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeToolActor: Actor<any> | null = null;

/**
 * Last state instructions
 */
let lastStateInstructions: string | null = null;

/**
 * List of entities like lines, circles, rectangles, etc to be drawn on the canvas
 */
let entities: Entity[] = [];

/**
 * Entities that are highlighted: when the mouse is close to an entity
 */
let highlightedEntityIds: string[] = [];

/**
 * Entities that are selected by the user by clicking on them with the select tool or by selecting them with a selection rectangle
 */
let selectedEntityIds: string[] = [];

/**
 * Entity/Entities that is currently being drawn, but isn't/aren't complete yet
 */
let activeEntity: Entity | null = null;

/**
 * Rectangle that indicates the selection rectangle
 */
let activeSelectionRect: RectangleEntity | null = null;

/**
 * Whether to draw the cursor or not
 */
let shouldDrawCursor = false;

/**
 * Angle guide temporary entities, these are recalculated every frame as the user moves their mouse during a draw action
 */
let angleGuideEntities: Entity[] = [];

/**
 * These are entities that are being drawn on the canvas during a move, scale or rotate operation
 * To give visual feedback to the user of the final result
 */
let ghostHelperEntities: Entity[] = [];

/**
 * Should helper entities be calculated and drawn? eg: angle guides and snap points
 */
let shouldDrawHelpers: boolean = false;

/**
 * Entities that are drawn for debugging the application purposes
 */
let debugEntities: Entity[] = [];

/**
 * Angle step for angle guide. Can be changes by the user using the angle step buttons
 */
let angleStep = 45;

/**
 * Offset by which the screen is panned. Starts at 0,0 which coincides with the world origin
 * But the user can move it by dragging the mouse while holding the middle mouse button
 */
let screenOffset = new Point(0, 0);

/**
 * Scale by which the screen is zoomed in or out. Starts at 1 when it coincides with the world scale
 */
let screenZoom = 1;

/**
 * Location where the user started dragging their mouse
 * Used for panning the screen
 */
let panStartLocation: Point | null = null;

/**
 * Entity snap point like endpoint of a line or mid point of a line or circle center point or the intersection of 2 lines
 */
let snapPoint: SnapPoint | null = null;

/**
 * Snap point on angle guide
 */
let snapPointOnAngleGuide: SnapPoint | null = null;

/**
 * Snap points that are hovered for a certain amount of time
 */
let hoveredSnapPoints: HoverPoint[] = [];

/**
 * Timestamp of the last draw call
 */
let lastDrawTimestamp: DOMHighResTimeStamp = 0;

/**
 * Active line color
 */
let activeLineColor = '#fff';

/**
 * Active line width
 */
let activeLineWidth = 1;

// getters
export const getCanvasSize = () => canvasSize;
export const getCanvas = () => canvas;
export const getContext = () => context;
export const getScreenMouseLocation = () => screenMouseLocation;
export const getActiveToolActor = () => activeToolActor;
export const getLastStateInstructions = () => lastStateInstructions;
export const getEntities = (): Entity[] => entities;
export const getHighlightedEntityIds = () => highlightedEntityIds;
export const getSelectedEntityIds = () => selectedEntityIds;
export const getActiveEntity = () => activeEntity;
export const getActiveSelectionRect = () => activeSelectionRect;
export const getShouldDrawCursor = () => shouldDrawCursor;
export const getAngleGuideEntities = () => angleGuideEntities;
export const getGhostHelperEntities = () => ghostHelperEntities;
export const getShouldDrawHelpers = () => shouldDrawHelpers;
export const getDebugEntities = () => debugEntities;
export const getAngleStep = () => angleStep;
export const getScreenOffset = () => screenOffset;
export const getScreenZoom = () => screenZoom;
export const getPanStartLocation = () => panStartLocation;
export const getSnapPoint = () => snapPoint;
export const getSnapPointOnAngleGuide = () => snapPointOnAngleGuide;
export const getHoveredSnapPoints = () => hoveredSnapPoints;
export const getLastDrawTimestamp = () => lastDrawTimestamp;
export const getActiveLineColor = () => activeLineColor;
export const getActiveLineWidth = () => activeLineWidth;

// computed getters
export const getWorldMouseLocation = () => screenToWorld(screenMouseLocation);

export const getSelectedEntities = (): Entity[] => {
  return entities.filter(e => selectedEntityIds.includes(e.id));
};
export const getNotSelectedEntities = (): Entity[] => {
  return entities.filter(e => !selectedEntityIds.includes(e.id));
};
export const isEntitySelected = (entity: Entity) =>
  selectedEntityIds.includes(entity.id);
export const isEntityHighlighted = (entity: Entity) =>
  highlightedEntityIds.includes(entity.id);
export const getActiveTool = (): Tool | null =>
  activeToolActor?.getSnapshot()?.context?.type || null;

// setters
export const setCanvasSize = (newCanvasSize: Point) =>
  (canvasSize = newCanvasSize);
export const setCanvas = (newCanvas: HTMLCanvasElement) => (canvas = newCanvas);
export const setContext = (newContext: CanvasRenderingContext2D) =>
  (context = newContext);
export const setScreenMouseLocation = (newLocation: Point) =>
  (screenMouseLocation = newLocation);
export const setActiveToolActor = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newToolActor: Actor<any>,
  triggerReact: boolean = true,
) => {
  getActiveToolActor()?.stop();

  activeToolActor = newToolActor;
  activeToolActor.subscribe(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: MachineSnapshot<any, any, any, any, any, any, any, any>) => {
      const stateInstructions = Object.values(
        state?.getMeta() as Record<string, StateMetaData>,
      )[0]?.instructions;

      if (getLastStateInstructions() === stateInstructions) {
        return;
      }

      setLastStateInstructions(stateInstructions || null);

      if (stateInstructions) {
        document.getElementById('toolInstructions')!.innerText =
          stateInstructions;
        console.log('STATE: ' + stateInstructions);
      }
    },
  );
  activeToolActor.start();

  if (triggerReact) {
    triggerReactUpdate(StateVariable.activeTool);
  }
};
export const setLastStateInstructions = (newInstructions: string | null) =>
  (lastStateInstructions = newInstructions);
export const setEntities = (newEntities: Entity[]) => {
  trackUndoState(StateVariable.entities, entities);
  entities = newEntities;
};
export const setActiveEntity = (newActiveEntity: Entity | null) => {
  activeEntity = newActiveEntity;
};
export const setActiveSelectionRect = (
  newActiveSelectionRect: RectangleEntity,
) => {
  activeSelectionRect = newActiveSelectionRect;
};
export const setHighlightedEntityIds = (newEntityIds: string[]) =>
  (highlightedEntityIds = newEntityIds);
export const setSelectedEntityIds = (newEntityIds: string[]) =>
  (selectedEntityIds = newEntityIds);
export const setShouldDrawCursor = (newValue: boolean) =>
  (shouldDrawCursor = newValue);
export const setAngleGuideEntities = (newAngleGuideEntities: Entity[]) =>
  (angleGuideEntities = newAngleGuideEntities);
export const setGhostHelperEntities = (newGhostHelperEntities: Entity[]) =>
  (ghostHelperEntities = newGhostHelperEntities);
export const setShouldDrawHelpers = (shouldDraw: boolean) => {
  console.log('setShouldDrawHelpers', shouldDraw);
  setSnapPoint(null);
  setSnapPointOnAngleGuide(null);
  setAngleGuideEntities([]);
  return (shouldDrawHelpers = shouldDraw);
};
export const setDebugEntities = (newDebugEntities: Entity[]) =>
  (debugEntities = newDebugEntities);
export const setAngleStep = (newStep: number, triggerReact: boolean = true) => {
  angleStep = newStep;

  if (triggerReact) {
    triggerReactUpdate(StateVariable.activeTool);
  }
};
export const setScreenOffset = (newOffset: Point) => {
  screenOffset = newOffset;
};
export const setScreenZoom = (newZoom: number) => {
  screenZoom = newZoom;
  triggerReactUpdate(StateVariable.screenZoom);
};
export const setPanStartLocation = (newLocation: Point | null) =>
  (panStartLocation = newLocation);
export const setSnapPoint = (newSnapPoint: SnapPoint | null) =>
  (snapPoint = newSnapPoint);
export const setSnapPointOnAngleGuide = (
  newSnapPointOnAngleGuide: SnapPoint | null,
) => (snapPointOnAngleGuide = newSnapPointOnAngleGuide);
export const setHoveredSnapPoints = (newHoveredSnapPoints: HoverPoint[]) =>
  (hoveredSnapPoints = newHoveredSnapPoints);
export const setLastDrawTimestamp = (newTimestamp: DOMHighResTimeStamp) =>
  (lastDrawTimestamp = newTimestamp);
export const setActiveLineColor = (
  newColor: string,
  triggerReact: boolean = true,
) => {
  activeLineColor = newColor;

  if (triggerReact) {
    triggerReactUpdate(StateVariable.activeLineColor);
  }
};
export const setActiveLineWidth = (
  newWidth: number,
  triggerReact: boolean = true,
) => {
  activeLineWidth = newWidth;

  if (triggerReact) {
    triggerReactUpdate(StateVariable.activeLineWidth);
  }
};

// Computed setters
export const deleteEntity = (...entitiesToDelete: Entity[]): Entity[] => {
  const entityIdsToBeDeleted = entitiesToDelete.map(entity => entity.id);
  const newEntities = getEntities().filter(
    entity => !entityIdsToBeDeleted.includes(entity.id),
  );
  setEntities(newEntities);
  return newEntities;
};
export const addEntity = (...entitiesToAdd: Entity[]): Entity[] => {
  const newEntities = [...getEntities(), ...entitiesToAdd];
  setEntities(newEntities);
  return newEntities;
};

// Undo redo states
const reactStateVariables: StateVariable[] = [
  StateVariable.activeTool,
  StateVariable.angleStep,
  StateVariable.activeLineColor,
  StateVariable.activeLineWidth,
  StateVariable.screenZoom,
];

const undoableStateVariables: StateVariable[] = [StateVariable.entities];

const undoableAndCompactableStateVariables: StateVariable[] = [];

const undoStack = createStack();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function trackUndoState(variable: StateVariable, oldValue: any) {
  if (!undoableStateVariables.includes(variable)) return;

  const lastUndoState = undoStack.peek();
  if (isEqual(oldValue, lastUndoState?.value)) {
    return; // Sometimes entities are updated because of highlighting, but not actually differ with the last list of entities
  }

  if (variable !== StateVariable.activeEntity) {
    // Clear active entity changes from the undo history when anything else changes
    // Since we don't want to undo drawing old entities point by point
    undoStack.clear(StateVariable.activeEntity);
  }

  if (undoableAndCompactableStateVariables.includes(variable)) {
    // See if we need to merge with the last state to avoid a million undo states for eg pan or zoom actions

    if (lastUndoState?.variable === variable) {
      // Replace the old undo state
      undoStack.replace({ variable: variable, value: oldValue });
      return;
    }
  }
  // Push the new undo state
  undoStack.push({ variable: variable, value: oldValue });
}

function updateStates(undoState: UndoState) {
  const variable = undoState.variable;
  const value = undoState.value;

  // Do not use the setters for setting these states, otherwise you trigger the undo stack again
  switch (variable) {
    case StateVariable.entities:
      entities = value;
      break;
    case StateVariable.activeEntity:
      activeEntity = value;
      break;
    case StateVariable.angleStep:
      angleStep = value;
      break;
    case StateVariable.screenOffset:
      screenOffset = value;
      break;
    case StateVariable.screenZoom:
      screenZoom = value;
      break;
  }
}

export function undo() {
  const undoState = undoStack.undo();
  if (!undoState) return;

  updateStates(undoState);
}

export function redo() {
  const redoState = undoStack.redo();
  if (!redoState) return;

  updateStates(redoState);
}

function triggerReactUpdate(variable: StateVariable) {
  if (!reactStateVariables.includes(variable)) return;

  window.dispatchEvent(new CustomEvent(HtmlEvent.UPDATE_STATE));
}
