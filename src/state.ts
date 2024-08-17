import { Entity } from './entities/Entitity.ts';
import { Point } from '@flatten-js/core';
import { Tool } from './tools.ts';
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import { HoverPoint, SnapPoint } from './App.types.ts';

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

// setters
export const setCanvasSize = (newCanvasSize: Point) =>
  (canvasSize = newCanvasSize);
export const setCanvas = (newCanvas: HTMLCanvasElement) => (canvas = newCanvas);
export const setContext = (newContext: CanvasRenderingContext2D) =>
  (context = newContext);
export const setScreenMouseLocation = (newLocation: Point) =>
  (screenMouseLocation = newLocation);
export const setActiveTool = (newTool: Tool) => (activeTool = newTool);
export const setEntities = (newEntities: Entity[]) => (entities = newEntities);
export const setActiveEntity = (newEntity: Entity | null) =>
  (activeEntity = newEntity);
export const setShouldDrawCursor = (newValue: boolean) =>
  (shouldDrawCursor = newValue);
export const setHelperEntities = (newEntities: Entity[]) =>
  (helperEntities = newEntities);
export const setDebugEntities = (newDebugEntities: Entity[]) =>
  (debugEntities = newDebugEntities);
export const setAngleStep = (newStep: number) => (angleStep = newStep);
export const setScreenOffset = (newOffset: Point) => (screenOffset = newOffset);
export const setScreenScale = (newScale: number) => (screenScale = newScale);
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
