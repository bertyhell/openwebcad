import { Entity } from './entities/Entitity.ts';
import { Point } from '@flatten-js/core';
import { Tool } from './tools.ts';
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import { HoverPoint, SnapPoint } from './App.types.ts';
import { createStack, StateVariable, UndoState } from './helpers/undo-stack.ts';
import { isEqual } from 'es-toolkit';

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
 * Active tool like line tool or rectangle tool
 */
let activeTool = Tool.Line;

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
 * Entity that is currently being drawn, but isn't complete yet
 */
let activeEntity: Entity | null = null;

/**
 * Whether to draw the cursor or not
 */
let shouldDrawCursor = false;

/**
 * Helper entities like angle guides
 */
let helperEntities: Entity[] = [];

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
let screenScale = 1;

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

// getters
export const getCanvasSize = () => canvasSize;
export const getCanvas = () => canvas;
export const getContext = () => context;
export const getScreenMouseLocation = () => screenMouseLocation;
export const getActiveTool = () => activeTool;
export const getEntities = (): Entity[] => entities;
export const getHighlightedEntityIds = () => highlightedEntityIds;
export const getSelectedEntityIds = () => selectedEntityIds;
export const getActiveEntity = () => activeEntity;
export const getShouldDrawCursor = () => shouldDrawCursor;
export const getHelperEntities = () => helperEntities;
export const getDebugEntities = () => debugEntities;
export const getAngleStep = () => angleStep;
export const getScreenOffset = () => screenOffset;
export const getScreenScale = () => screenScale;
export const getPanStartLocation = () => panStartLocation;
export const getSnapPoint = () => snapPoint;
export const getSnapPointOnAngleGuide = () => snapPointOnAngleGuide;
export const getHoveredSnapPoints = () => hoveredSnapPoints;
export const getLastDrawTimestamp = () => lastDrawTimestamp;

// computed getters
export const getWorldMouseLocation = () =>
  screenToWorld(screenMouseLocation, screenOffset, screenScale);

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

// setters
export const setCanvasSize = (newCanvasSize: Point) =>
  (canvasSize = newCanvasSize);
export const setCanvas = (newCanvas: HTMLCanvasElement) => (canvas = newCanvas);
export const setContext = (newContext: CanvasRenderingContext2D) =>
  (context = newContext);
export const setScreenMouseLocation = (newLocation: Point) =>
  (screenMouseLocation = newLocation);
export const setActiveTool = (newTool: Tool) => {
  triggerReactUpdate(StateVariable.activeTool);
  activeTool = newTool;
};
export const setEntities = (newEntities: Entity[]) => {
  trackUndoState(StateVariable.entities, entities);
  entities = newEntities;
};
export const setActiveEntity = (newEntity: Entity | null) => {
  trackUndoState(StateVariable.activeEntity, activeEntity);
  activeEntity = newEntity;
};
export const setHighlightedEntityIds = (newEntityIds: string[]) =>
  (highlightedEntityIds = newEntityIds);
export const setSelectedEntityIds = (newEntityIds: string[]) =>
  (selectedEntityIds = newEntityIds);
export const setShouldDrawCursor = (newValue: boolean) =>
  (shouldDrawCursor = newValue);
export const setHelperEntities = (newEntities: Entity[]) =>
  (helperEntities = newEntities);
export const setDebugEntities = (newDebugEntities: Entity[]) =>
  (debugEntities = newDebugEntities);
export const setAngleStep = (newStep: number) => {
  triggerReactUpdate(StateVariable.activeTool);
  trackUndoState(StateVariable.angleStep, angleStep);
  angleStep = newStep;
};
export const setScreenOffset = (newOffset: Point) => {
  trackUndoState(StateVariable.screenOffset, screenOffset);
  screenOffset = newOffset;
};
export const setScreenScale = (newScale: number) => {
  trackUndoState(StateVariable.screenScale, screenScale);
  screenScale = newScale;
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

const reactStateVariables: StateVariable[] = [
  StateVariable.activeTool,
  StateVariable.angleStep,
];

const undoableStateVariables: StateVariable[] = [
  StateVariable.entities,
  StateVariable.activeEntity,
  StateVariable.angleStep,
  StateVariable.screenOffset,
  StateVariable.screenScale,
];

const undoableAndCompactableStateVariables: StateVariable[] = [
  StateVariable.angleStep,
  StateVariable.screenOffset,
  StateVariable.screenScale,
];

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
    case StateVariable.screenScale:
      screenScale = value;
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

  console.log('triggering react update for: ', variable);
  window.dispatchEvent(new CustomEvent(variable));
}
