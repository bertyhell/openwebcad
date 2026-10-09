import type { Point } from '@flatten-js/core';
import { isEqual } from 'es-toolkit';
import { toast } from 'react-toastify';
import type { Actor, MachineSnapshot } from 'xstate';
import {
	type GridSettings,
	type HoverPoint,
	HtmlEvent,
	type Layer,
	LOCAL_STORAGE_KEY,
	type SnapPoint,
	type StateMetaData,
} from './App.types';
import type { ScreenCanvasDrawController } from './drawControllers/screenCanvas.drawController';
import type { Entity } from './entities/Entity';
import { createStack, StateVariable, type UndoState } from './helpers/undo-stack';
import type { InputController } from './inputController/input-controller.ts'; // state variables

// state variables
/**
 * Canvas element
 */
let canvas: HTMLCanvasElement | null = null;

/**
 * Active tool xstate actor
 */
// biome-ignore lint/suspicious/noExplicitAny: every tool has its own context and event types
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
let highlightedEntityIdSet = new Set<string>();

/**
 * Entities that are drawn faded, eg: the original entities while previewing a move or rotate operation
 */
let dimmedEntityIds: string[] = [];

/**
 * Entities that are selected by the user by clicking on them with the select tool or by selecting them with a selection rectangle
 */
let selectedEntityIds: string[] = [];
let selectedEntityIdSet = new Set<string>();

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
let shouldDrawHelpers = false;

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
 * Active fill color
 */
let activeFillColor = '#fff';

/**
 * Active line width
 */
let activeLineWidth = 1;

/**
 * The canvas is only redrawn when something changed since the last frame
 */
let isRedrawRequested = true;

/**
 * Grid drawn behind the drawing, and whether points snap to it
 */
let gridSettings: GridSettings = loadGridSettings();

function loadGridSettings(): GridSettings {
	const defaultSettings: GridSettings = { isVisible: false, isSnapEnabled: false };
	try {
		const storedSettings = globalThis.localStorage?.getItem(LOCAL_STORAGE_KEY.GRID);
		return storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
	} catch {
		return defaultSettings;
	}
}

/**
 * Layers that can contain entities
 */
let layers: Layer[] = [
	{
		id: crypto.randomUUID(),
		isLocked: false,
		isVisible: true,
		name: 'Layer 1',
	},
];

/**
 * Id of the currently active layer where newly drawn entities will be added to
 */
let activeLayerId: string = layers[0].id;

// getters
export const getCanvas = () => canvas;
export const getActiveToolActor = () => activeToolActor;
export const getLastStateInstructions = () => lastStateInstructions;
export const getEntities = (): Entity[] => entities;
export const getSelectedEntityIds = () => selectedEntityIds;
export const getDimmedEntityIds = () => dimmedEntityIds;
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
export const getActiveFillColor = () => activeFillColor;
export const getActiveLineWidth = () => activeLineWidth;
export const getGridSettings = () => gridSettings;
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
	return entities.filter((e) => selectedEntityIdSet.has(e.id));
};
export const getNotSelectedEntities = (): Entity[] => {
	return entities.filter((e) => !selectedEntityIdSet.has(e.id));
};
/**
 * Filtered entity lists are cached as long as the entities and layers don't change,
 * so callers can use the identity of the returned list to cache expensive calculations, eg: intersections
 */
function memoizeByEntitiesAndLayers(
	compute: (entities: Entity[], layers: Layer[]) => Entity[]
): () => Entity[] {
	let cachedEntities: Entity[] | null = null;
	let cachedLayers: Layer[] | null = null;
	let cachedResult: Entity[] = [];
	return () => {
		if (cachedEntities !== entities || cachedLayers !== layers) {
			cachedEntities = entities;
			cachedLayers = layers;
			cachedResult = compute(entities, layers);
		}
		return cachedResult;
	};
}

/**
 * Entities on visible layers. Hidden layers don't provide snap points, intersections or highlights
 */
export const getVisibleEntities = memoizeByEntitiesAndLayers((allEntities, allLayers) => {
	const visibleLayerIds = new Set(
		allLayers.filter((layer) => layer.isVisible).map((layer) => layer.id)
	);
	return allEntities.filter((entity) => visibleLayerIds.has(entity.layerId));
});
/**
 * Entities on visible and unlocked layers, these are the entities that modify tools are allowed to change
 */
export const getEditableEntities = memoizeByEntitiesAndLayers((allEntities, allLayers) => {
	const editableLayerIds = new Set(
		allLayers.filter((layer) => layer.isVisible && !layer.isLocked).map((layer) => layer.id)
	);
	return allEntities.filter((entity) => editableLayerIds.has(entity.layerId));
});
export const isEntityEditable = (entity: Entity): boolean => {
	const layer = layers.find((layer) => layer.id === entity.layerId);
	return !!layer && layer.isVisible && !layer.isLocked;
};
/**
 * Selected entities that are not on a hidden or locked layer
 */
export const getEditableSelectedEntities = (): Entity[] => {
	return getSelectedEntities().filter(isEntityEditable);
};
export const isEntitySelected = (entity: Entity) => selectedEntityIdSet.has(entity.id);
export const isEntityHighlighted = (entity: Entity) => highlightedEntityIdSet.has(entity.id);
export const getLayers = () => {
	return layers;
};
export const getActiveLayerId = (): string => {
	return activeLayerId;
};

/**
 * Ask the draw loop to redraw the canvas on the next animation frame
 */
export const requestRedraw = () => {
	isRedrawRequested = true;
};
export const getIsRedrawRequested = () => isRedrawRequested;
export const clearRedrawRequest = () => {
	isRedrawRequested = false;
};

// setters
export const setCanvas = (newCanvas: HTMLCanvasElement) => {
	canvas = newCanvas;
};
// biome-ignore lint/suspicious/noExplicitAny: xstate snapshot of any tool state machine
const updateInstructionsFromSnapshot = (
	state: MachineSnapshot<any, any, any, any, any, any, any, any>
) => {
	const stateInstructions = Object.values(state?.getMeta() as Record<string, StateMetaData>)[0]
		?.instructions;

	if (getLastStateInstructions() === stateInstructions) {
		return;
	}

	setLastStateInstructions(stateInstructions || null);
};
export const setActiveToolActor = (
	// biome-ignore lint/suspicious/noExplicitAny: every tool has its own context and event types
	newToolActor: Actor<any>,
	triggerReact = true
) => {
	requestRedraw();
	const oldToolActor = getActiveToolActor();
	oldToolActor?.stop();
	// Clear the previews of the previous tool
	setGhostHelperEntities([]);
	setDimmedEntityIds([]);
	setHighlightedEntityIds([]);

	activeToolActor = newToolActor;
	activeToolActor.subscribe({
		next: (state) => {
			// A tool can switch to another tool during its own transition, ignore its snapshots after that
			if (activeToolActor !== newToolActor) return;
			updateInstructionsFromSnapshot(state);
		},
		error: (err) => {
			toast.error(`Error in tool actor: ${(err as Error | undefined)?.message || 'unknown error'}`);
			console.error('Error in tool actor', { err, newToolActor });
		},
	});
	activeToolActor.start();
	// Subscribers only receive later snapshots, so read the instructions of the initial state here
	updateInstructionsFromSnapshot(activeToolActor.getSnapshot());

	if (triggerReact) {
		triggerReactUpdate(StateVariable.activeTool);
	}
};
export const setLastStateInstructions = (newInstructions: string | null) => {
	requestRedraw();
	lastStateInstructions = newInstructions;
	triggerReactUpdate(StateVariable.instructions);
};
export const setEntities = (newEntities: Entity[], trackInUndoStack = false) => {
	requestRedraw();
	entities = newEntities;
	// The properties of the selected entities are shown in the sidebar
	triggerReactUpdate(StateVariable.entities);
	if (trackInUndoStack) {
		commitUndoState();
	}
};
export const setHighlightedEntityIds = (newEntityIds: string[]) => {
	requestRedraw();
	highlightedEntityIdSet = new Set(newEntityIds);
};
export const setSelectedEntityIds = (newEntityIds: string[]) => {
	requestRedraw();
	const selectionChanged = !isEqual(selectedEntityIds, newEntityIds);
	selectedEntityIds = newEntityIds;
	selectedEntityIdSet = new Set(newEntityIds);

	if (selectionChanged) {
		triggerReactUpdate(StateVariable.selectedEntityIds);
	}
};
export const setDimmedEntityIds = (newEntityIds: string[]) => {
	requestRedraw();
	dimmedEntityIds = newEntityIds;
};
export const setShouldDrawCursor = (newValue: boolean) => {
	requestRedraw();
	shouldDrawCursor = newValue;
};
export const setAngleGuideEntities = (newAngleGuideEntities: Entity[]) => {
	requestRedraw();
	angleGuideEntities = newAngleGuideEntities;
};
export const setGhostHelperEntities = (newGhostHelperEntities: Entity[]) => {
	requestRedraw();
	ghostHelperEntities = newGhostHelperEntities;
};
export const setShouldDrawHelpers = (shouldDraw: boolean) => {
	requestRedraw();
	setSnapPoint(null);
	setSnapPointOnAngleGuide(null);
	setAngleGuideEntities([]);
	shouldDrawHelpers = shouldDraw;
};
export const setDebugEntities = (newDebugEntities: Entity[]) => {
	requestRedraw();
	debugEntities = newDebugEntities;
};
export const setAngleStep = (newStep: number, triggerReact = true) => {
	angleStep = newStep;

	if (triggerReact) {
		triggerReactUpdate(StateVariable.angleStep);
	}
};
export const setScreenCanvasDrawController = (
	newScreenCanvasDrawController: ScreenCanvasDrawController
) => {
	screenCanvasDrawController = newScreenCanvasDrawController;
};
export const setInputController = (newInputController: InputController) => {
	inputController = newInputController;
};
export const setPanStartLocation = (newLocation: Point | null) => {
	panStartLocation = newLocation;
};
export const setSnapPoint = (newSnapPoint: SnapPoint | null) => {
	requestRedraw();
	snapPoint = newSnapPoint;
};
export const setSnapPointOnAngleGuide = (newSnapPointOnAngleGuide: SnapPoint | null) => {
	requestRedraw();
	snapPointOnAngleGuide = newSnapPointOnAngleGuide;
};
export const setAngleGuideOriginPoint = (newAngleGuideOriginPoint: Point | null) => {
	angleGuideOriginPoint = newAngleGuideOriginPoint;
};
export const setHoveredSnapPoints = (newHoveredSnapPoints: HoverPoint[]) => {
	hoveredSnapPoints = newHoveredSnapPoints;
};
export const setLastDrawTimestamp = (newTimestamp: DOMHighResTimeStamp) => {
	lastDrawTimestamp = newTimestamp;
};
export const setActiveLineColor = (newColor: string, triggerReact = true) => {
	activeLineColor = newColor;

	if (triggerReact) {
		triggerReactUpdate(StateVariable.activeLineColor);
	}
};
export const setActiveFillColor = (newColor: string, triggerReact = true) => {
	activeFillColor = newColor;

	if (triggerReact) {
		triggerReactUpdate(StateVariable.activeFillColor);
	}
};
export const setActiveLineWidth = (newWidth: number, triggerReact = true) => {
	activeLineWidth = newWidth;

	if (triggerReact) {
		triggerReactUpdate(StateVariable.activeLineWidth);
	}
};
export const setGridSettings = (newGridSettings: GridSettings) => {
	requestRedraw();
	gridSettings = newGridSettings;
	try {
		localStorage.setItem(LOCAL_STORAGE_KEY.GRID, JSON.stringify(newGridSettings));
	} catch {
		// The grid settings are a convenience, they don't need to be stored
	}
	triggerReactUpdate(StateVariable.gridSettings);
};
export const setLayers = (newLayers: Layer[], triggerReact = true, trackInUndoStack = false) => {
	requestRedraw();
	layers = newLayers;
	if (trackInUndoStack) {
		commitUndoState();
	}

	if (triggerReact) {
		triggerReactUpdate(StateVariable.layers);
	}
};
export const setActiveLayerId = (newActiveLayerId: string, triggerReact = true) => {
	requestRedraw();
	activeLayerId = newActiveLayerId;
	// New entities on a layer with a color get that color
	const layerColor = layers.find((layer) => layer.id === newActiveLayerId)?.color;
	if (layerColor) {
		activeLineColor = layerColor;
		triggerReactUpdate(StateVariable.activeLineColor);
	}

	if (triggerReact) {
		triggerReactUpdate(StateVariable.layers);
	}
};

// Computed setters
export const deleteEntities = (entitiesToDelete: Entity[], trackInUndoStack: boolean): Entity[] => {
	const entityIdsToBeDeleted = entitiesToDelete.map((entity) => entity.id);
	const newEntities = getEntities().filter((entity) => !entityIdsToBeDeleted.includes(entity.id));
	setEntities(newEntities, trackInUndoStack);
	return newEntities;
};
export const addEntities = (entitiesToAdd: Entity[], trackInUndoStack: boolean): Entity[] => {
	const newEntities = [...getEntities(), ...entitiesToAdd];
	setEntities(newEntities, trackInUndoStack);
	return newEntities;
};

// Undo redo states
const reactStateVariables: StateVariable[] = [
	StateVariable.activeTool,
	StateVariable.angleStep,
	StateVariable.activeLineColor,
	StateVariable.activeFillColor,
	StateVariable.activeLineWidth,
	StateVariable.screenZoom,
	StateVariable.layers,
	StateVariable.selectedEntityIds,
	StateVariable.instructions,
	StateVariable.entities,
	StateVariable.gridSettings,
];

const undoStack = createStack();

/**
 * Entities can be re-created with the same content, eg: by filtering a list without removing anything
 * Only compare deeply when the cheap reference comparison doesn't already tell the lists are equal
 */
function isSameList<T>(listA: T[], listB: T[] | undefined): boolean {
	if (!listB || listA.length !== listB.length) {
		return false;
	}
	if (listA.every((item, index) => item === listB[index])) {
		return true;
	}
	return isEqual(listA, listB);
}

/**
 * Push the current entities and layers as a new undo state, unless nothing changed since the last undo state
 */
export function commitUndoState() {
	const lastUndoState = undoStack.peek();
	if (isSameList(entities, lastUndoState?.entities) && isSameList(layers, lastUndoState?.layers)) {
		return;
	}
	undoStack.push({ entities, layers });
	notifyDrawingChanged();
}

/**
 * Lets listeners like autosave know that the entities or layers changed
 */
function notifyDrawingChanged() {
	if (typeof window === 'undefined' || isTestEnvironment()) {
		return;
	}
	window.dispatchEvent(new CustomEvent(HtmlEvent.DRAWING_CHANGED));
}

function isTestEnvironment(): boolean {
	return typeof process === 'object' && process?.env?.NODE_ENV === 'test';
}

/**
 * Makes the current drawing the start of the undo history, eg: after loading a drawing
 * so undo can't go back to the empty drawing from before it was loaded
 */
export function resetUndoHistory() {
	undoStack.clear();
	undoStack.push({ entities, layers });
}

function restoreUndoState(undoState: UndoState) {
	// Do not use the setters for setting these states, otherwise you trigger the undo stack again
	entities = undoState.entities;
	layers = undoState.layers;
	if (!layers.some((layer) => layer.id === activeLayerId)) {
		activeLayerId = layers[0]?.id;
	}
	requestRedraw();
	triggerReactUpdate(StateVariable.layers);
	triggerReactUpdate(StateVariable.entities);
	notifyDrawingChanged();
}

export function undo() {
	const undoState = undoStack.undo();
	if (!undoState) return;

	restoreUndoState(undoState);
}

export function redo() {
	const redoState = undoStack.redo();
	if (!redoState) return;

	restoreUndoState(redoState);
}

export function triggerReactUpdate(variable: StateVariable) {
	if (isTestEnvironment()) {
		return;
	}

	if (!reactStateVariables.includes(variable)) {
		return;
	}

	window.dispatchEvent(new CustomEvent(HtmlEvent.UPDATE_STATE));
}
