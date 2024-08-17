import { Entity } from './entities/Entitity.ts';
import { Point } from '@flatten-js/core';
import { Tool } from './tools.ts';
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import { HoverPoint, SnapPoint } from './App.types.ts';

// state variables
let canvasSize = new Point(0, 0);
let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let screenMouseLocation = new Point(0, 0);
let canvasRef: HTMLCanvasElement | null = document.querySelector('canvas');
let activeTool = Tool.Line;
let entities: Entity[] = [];
let activeEntity: Entity | null = null;
let shouldDrawCursor = false;
let helperEntities: Entity[] = [];
let debugEntities: Entity[] = [];
let angleStep = 45;
let screenOffset = new Point(0, 0);
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
export const getCanvasRef = (): HTMLCanvasElement | null => canvasRef;
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
export const setCanvasRef = (newCanvasRef: HTMLCanvasElement) =>
  (canvasRef = newCanvasRef);
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
