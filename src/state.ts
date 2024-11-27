import { Entity } from './entities/Entity';
import { Point } from '@flatten-js/core';
import { HoverPoint, HtmlEvent, SnapPoint, StateMetaData } from './App.types';
import { createStack, StateVariable, UndoState } from './helpers/undo-stack';
import { isEqual } from 'es-toolkit';
import { Actor, MachineSnapshot } from 'xstate';
import { ScreenCanvasDrawController } from './drawControllers/screenCanvas.drawController';
import { InputController } from './helpers/input-controller.ts'; // state variables

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
 * Draw controller to draw lines to the screen while taking zoom level and screen offset into account
 * We use a drawController, so we can reuse draw logic of the entities for printing to PDF and possibly more formats in the future
 */
let screenCanvasDrawController: ScreenCanvasDrawController | null = null;

/**
 * Class object to manage keyboard input while drawing
 * It also draws the inputted text to the canvas, next to the cursor
 */
let inputController: InputController | null = null;

/**
 * Location where the user started dragging their mouse
 * Used for panning the screen
 */
let panStartLocation: Point | null = null;

/**
 * Entity snap point like endpoint of a line or mid-point of a line or circle center point or the intersection of 2 lines
 */
let snapPoint: SnapPoint | null = null;

/**
 * Snap point on angle guide
 */
let snapPointOnAngleGuide: SnapPoint | null = null;

/**
 * Last drawn point of an entity that is being drawn to be used as angle guide origin
 */
let angleGuideOriginPoint: Point | null = null;

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
export const getActiveToolActor = () => activeToolActor;
export const getLastStateInstructions = () => lastStateInstructions;
export const getEntities = (): Entity[] => entities;
export const getSelectedEntityIds = () => selectedEntityIds;
export const getShouldDrawCursor = () => shouldDrawCursor;
export const getAngleGuideEntities = () => angleGuideEntities;
export const getGhostHelperEntities = () => ghostHelperEntities;
export const getShouldDrawHelpers = () => shouldDrawHelpers;
export const getDebugEntities = () => debugEntities;
export const getAngleStep = () => angleStep;
export const getPanStartLocation = () => panStartLocation;
export const getSnapPoint = () => snapPoint;
export const getSnapPointOnAngleGuide = () => snapPointOnAngleGuide;
export const getAngleGuideOriginPoint = () => angleGuideOriginPoint;
export const getHoveredSnapPoints = () => hoveredSnapPoints;
export const getLastDrawTimestamp = () => lastDrawTimestamp;
export const getActiveLineColor = () => activeLineColor;
export const getActiveLineWidth = () => activeLineWidth;
export const getScreenCanvasDrawController = (): ScreenCanvasDrawController => {
  if (!screenCanvasDrawController) {
    throw new Error('getScreenCanvasDrawController() returned null');
  }
  return screenCanvasDrawController;
};
export const getInputController = (): InputController => {
  if (!inputController) {
    throw new Error('getInputController() returned null');
  }
  return inputController;
};

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
    },
  );
  activeToolActor.start();

  console.log('User clicked on tool: ', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activeTool: (activeToolActor.src as any).config.context.type,
  });

  if (triggerReact) {
    triggerReactUpdate(StateVariable.activeTool);
  }
};
export const setLastStateInstructions = (newInstructions: string | null) =>
  (lastStateInstructions = newInstructions);
export const setEntities = (
  newEntities: Entity[],
  trackInUndoStack: boolean = false,
) => {
  if (trackInUndoStack) {
    trackUndoState(StateVariable.entities, newEntities);
  }
  entities = newEntities;
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
export const setScreenCanvasDrawController = (
  newScreenCanvasDrawController: ScreenCanvasDrawController,
) => (screenCanvasDrawController = newScreenCanvasDrawController);
export const setInputController = (newInputController: InputController) =>
  (inputController = newInputController);
export const setPanStartLocation = (newLocation: Point | null) =>
  (panStartLocation = newLocation);
export const setSnapPoint = (newSnapPoint: SnapPoint | null) =>
  (snapPoint = newSnapPoint);
export const setSnapPointOnAngleGuide = (
  newSnapPointOnAngleGuide: SnapPoint | null,
) => (snapPointOnAngleGuide = newSnapPointOnAngleGuide);
export const setAngleGuideOriginPoint = (
  newAngleGuideOriginPoint: Point | null,
) => (angleGuideOriginPoint = newAngleGuideOriginPoint);
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
export const deleteEntities = (
  entitiesToDelete: Entity[],
  trackInUndoStack: boolean,
): Entity[] => {
  const entityIdsToBeDeleted = entitiesToDelete.map(entity => entity.id);
  const newEntities = getEntities().filter(
    entity => !entityIdsToBeDeleted.includes(entity.id),
  );
  setEntities(newEntities, trackInUndoStack);
  return newEntities;
};
export const addEntities = (
  entitiesToAdd: Entity[],
  trackInUndoStack: boolean,
): Entity[] => {
  const newEntities = [...getEntities(), ...entitiesToAdd];
  setEntities(newEntities, trackInUndoStack);
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

const undoStack = createStack();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function trackUndoState(variable: StateVariable, value: any) {
  if (!undoableStateVariables.includes(variable)) return;

  const lastUndoState = undoStack.peek();
  if (isEqual(value, lastUndoState?.value)) {
    return; // Sometimes entities are updated because of highlighting, but not actually differ with the last list of entities
  }

  // Push the new undo state
  console.log('Pushing undo state', variable, value);
  undoStack.push({ variable: variable, value: value });
}

function updateStates(undoState: UndoState) {
  const variable = undoState.variable;
  const value = undoState.value;

  // Do not use the setters for setting these states, otherwise you trigger the undo stack again
  switch (variable) {
    case StateVariable.entities:
      entities = value;
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

export function triggerReactUpdate(variable: StateVariable) {
  if (!reactStateVariables.includes(variable)) return;

  window.dispatchEvent(new CustomEvent(HtmlEvent.UPDATE_STATE));
}
