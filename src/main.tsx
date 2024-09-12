import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.scss';
import {
  getActiveEntity,
  getActiveTool,
  getAngleStep,
  getCanvas,
  getCanvasSize,
  getEntities,
  getHoveredSnapPoints,
  getLastDrawTimestamp,
  getNotSelectedEntities,
  getPanStartLocation,
  getScreenMouseLocation,
  getScreenOffset,
  getScreenScale,
  getShouldDrawHelpers,
  getSnapPoint,
  getSnapPointOnAngleGuide,
  getWorldMouseLocation,
  redo,
  setActiveEntity,
  setCanvas,
  setCanvasSize,
  setContext,
  setEntities,
  setHelperEntities,
  setHighlightedEntityIds,
  setHoveredSnapPoints,
  setLastDrawTimestamp,
  setPanStartLocation,
  setScreenMouseLocation,
  setScreenOffset,
  setScreenScale,
  setSelectedEntityIds,
  setShouldDrawCursor,
  setSnapPoint,
  setSnapPointOnAngleGuide,
  undo,
} from './state.ts';
import { DrawInfo, MouseButton } from './App.types.ts';
import { Tool } from './tools.ts';
import { Point } from '@flatten-js/core';
import { getDrawHelpers } from './helpers/get-draw-guides.ts';
import {
  HIGHLIGHT_ENTITY_DISTANCE,
  HOVERED_SNAP_POINT_TIME,
  MOUSE_ZOOM_MULTIPLIER,
  SNAP_POINT_DISTANCE,
} from './App.consts.ts';
import { draw } from './helpers/draw.ts';
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import { getClosestSnapPointWithinRadius } from './helpers/get-closest-snap-point.ts';
import { findClosestEntity } from './helpers/find-closest-entity.ts';
import { trackHoveredSnapPoint } from './helpers/track-hovered-snap-points.ts';
import { compact } from 'es-toolkit';
import { toolActors } from './tools/tool.consts.ts';
import { ActorEvent, DrawEvent, MouseClickEvent } from './tools/tool.types.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function handleMouseEnter() {
  setShouldDrawCursor(true);
}

function handleMouseMove(evt: MouseEvent) {
  setShouldDrawCursor(true);
  setScreenMouseLocation(new Point(evt.clientX, evt.clientY));

  // If the middle mouse button is pressed, pan the screen
  const panStartLocation = getPanStartLocation();
  const screenOffset = getScreenOffset();
  const screenScale = getScreenScale();
  if (panStartLocation) {
    // Pan the screen by the last mouse movement
    const newOffset = new Point(
      screenOffset.x - (evt.clientX - panStartLocation.x) / screenScale,
      screenOffset.y - (evt.clientY - panStartLocation.y) / screenScale,
    );
    setPanStartLocation(new Point(evt.clientX, evt.clientY));
    setScreenOffset(newOffset);
  }

  // Calculate angle guides and snap points
  calculateAngleGuidesAndSnapPoints();

  // Highlight the entity closest to the mouse when the select tool is active
  if (getActiveTool() === Tool.Select) {
    const closestEntityInfo = findClosestEntity(
      getWorldMouseLocation(),
      getEntities(),
    );
    if (closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE) {
      setHighlightedEntityIds([closestEntityInfo.entity.id]);
    } else {
      setHighlightedEntityIds([]);
    }
  }
}

function handleMouseOut() {
  setShouldDrawCursor(false);
}

/**
 * Change the zoom level of screen space
 * @param evt
 */
function handleMouseWheel(evt: WheelEvent) {
  const screenOffset = getScreenOffset();
  const screenScale = getScreenScale();
  const worldMouseLocationBeforeZoom = getWorldMouseLocation();
  const newScreenScale =
    screenScale *
    (1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)));
  setScreenScale(newScreenScale);

  // ...now get the location of the cursor in world space again - It will have changed
  // because the scale has changed, but we can offset our world now to fix the zoom
  // location in screen space, because we know how much it changed laterally between
  // the two spatial scales. Neat huh? ;-)
  const worldMouseLocationAfterZoom = screenToWorld(getScreenMouseLocation());

  setScreenOffset(
    new Point(
      screenOffset.x +
        (worldMouseLocationBeforeZoom.x - worldMouseLocationAfterZoom.x),
      screenOffset.y +
        (worldMouseLocationBeforeZoom.y - worldMouseLocationAfterZoom.y),
    ),
  );
}

function handleMouseDown(evt: MouseEvent) {
  if (evt.button !== MouseButton.Middle) return;

  setPanStartLocation(new Point(evt.clientX, evt.clientY));
}

function handleMouseUp(evt: MouseEvent) {
  if (evt.button === MouseButton.Middle) {
    setPanStartLocation(null);
  }
  if (evt.button === MouseButton.Left) {
    const closestSnapPoint = getClosestSnapPointWithinRadius(
      compact([getSnapPoint(), getSnapPointOnAngleGuide()]),
      getWorldMouseLocation(),
      SNAP_POINT_DISTANCE / getScreenScale(),
    );

    const worldMouseLocationTemp = screenToWorld(
      new Point(evt.clientX, evt.clientY),
    );
    const worldClickPoint = closestSnapPoint
      ? closestSnapPoint.point
      : worldMouseLocationTemp;

    const activeTool = getActiveTool();
    toolActors[activeTool]?.send({
      type: ActorEvent.MOUSE_CLICK,
      worldClickPoint,
      holdingCtrl: evt.ctrlKey,
      holdingShift: evt.shiftKey,
    } as MouseClickEvent);
  }
}

function handleKeyUp(evt: KeyboardEvent) {
  if (evt.key === 'Escape') {
    evt.preventDefault();
    setActiveEntity(null);
    setHighlightedEntityIds([]);
    setSelectedEntityIds([]);

    toolActors[getActiveTool()]?.send({
      type: ActorEvent.ESC,
    } as KeyboardEvent);
  } else if (evt.key === 'Delete') {
    evt.preventDefault();
    setEntities(getNotSelectedEntities());
    setSelectedEntityIds([]);
    setActiveEntity(null);
  } else if (evt.key === 'z' && evt.ctrlKey && !evt.shiftKey) {
    evt.preventDefault();
    undo();
    setActiveEntity(null);
    setSelectedEntityIds([]);
  } else if (evt.key === 'z' && evt.ctrlKey && evt.shiftKey) {
    evt.preventDefault();
    redo();
    setActiveEntity(null);
    setSelectedEntityIds([]);
  } else if (evt.key === 'l') {
    evt.preventDefault();
    toolActors[getActiveTool()]?.stop();
    toolActors[Tool.Line]?.start();
  } else if (evt.key === 'c') {
    evt.preventDefault();
    toolActors[getActiveTool()]?.stop();
    toolActors[Tool.Circle]?.start();
  } else if (evt.key === 'r') {
    evt.preventDefault();
    toolActors[getActiveTool()]?.stop();
    toolActors[Tool.Rectangle]?.start();
  } else if (evt.key === 's') {
    evt.preventDefault();
    toolActors[getActiveTool()]?.stop();
    toolActors[Tool.Select]?.start();
  } else if (evt.key === 'm') {
    evt.preventDefault();
    toolActors[getActiveTool()]?.stop();
    toolActors[Tool.Move]?.start();
  }
}

/**
 * Calculate angle guides and snap points
 */
function calculateAngleGuidesAndSnapPoints() {
  const angleStep = getAngleStep();
  const activeEntity = getActiveEntity();
  const entities = getEntities();
  const screenScale = getScreenScale();
  const worldMouseLocation = getWorldMouseLocation();
  const hoveredSnapPoints = getHoveredSnapPoints();

  const eligibleHoveredSnapPoints = hoveredSnapPoints.filter(
    hoveredSnapPoint =>
      hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME,
  );

  const eligibleHoveredPoints = eligibleHoveredSnapPoints.map(
    hoveredSnapPoint => hoveredSnapPoint.snapPoint.point,
  );

  if (getShouldDrawHelpers()) {
    console.log('drawing helpers');
    // If you're in the progress of drawing a shape, show the angle guides and closest snap point
    let firstPoint: Point | null = null;
    if (
      activeEntity &&
      !!activeEntity.getShape() &&
      activeEntity.getFirstPoint()
    ) {
      firstPoint = activeEntity.getFirstPoint();
    }

    const { angleGuides, entitySnapPoint, angleSnapPoint } = getDrawHelpers(
      entities,
      compact([firstPoint, ...eligibleHoveredPoints]),
      worldMouseLocation,
      angleStep,
      SNAP_POINT_DISTANCE / screenScale,
    );
    setHelperEntities(angleGuides);
    setSnapPoint(entitySnapPoint);
    setSnapPointOnAngleGuide(angleSnapPoint);
  }
}

function startDrawLoop(
  context: CanvasRenderingContext2D,
  timestamp: DOMHighResTimeStamp,
) {
  const canvasSize = getCanvasSize();
  const screenMouseLocation = getScreenMouseLocation();
  const worldMouseLocation = getWorldMouseLocation();
  const screenScale = getScreenScale();
  const screenOffset = getScreenOffset();
  const lastDrawTimestamp = getLastDrawTimestamp();

  const elapsedTime = timestamp - lastDrawTimestamp;
  setLastDrawTimestamp(timestamp);

  const drawInfo: DrawInfo = {
    context,
    canvasSize,
    worldMouseLocation: worldMouseLocation,
    screenMouseLocation: screenMouseLocation,
    screenOffset,
    screenZoom: screenScale,
  };

  toolActors[getActiveTool()].send({
    type: ActorEvent.DRAW,
    drawInfo,
  } as DrawEvent);

  /**
   * Highlight the entity closest to the mouse when the select tool is active
   */
  if (getActiveTool() === Tool.Select) {
    const { distance, entity: closestEntity } = findClosestEntity(
      screenToWorld(screenMouseLocation),
      getEntities(),
    );

    if (distance < HIGHLIGHT_ENTITY_DISTANCE) {
      setHighlightedEntityIds([closestEntity.id]);
    }
  }

  /**
   * Track hovered snap points
   */
  trackHoveredSnapPoint(
    getSnapPoint(),
    getHoveredSnapPoints(),
    setHoveredSnapPoints,
    SNAP_POINT_DISTANCE / getScreenScale(),
    elapsedTime,
  );

  /**
   * Draw everything on the canvas
   */
  draw(drawInfo);

  requestAnimationFrame((newTimestamp: DOMHighResTimeStamp) => {
    startDrawLoop(context, newTimestamp);
  });
}

function handleWindowResize() {
  console.log('handle window resize', {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  setCanvasSize(new Point(window.innerWidth, window.innerHeight));
  const canvas = getCanvas();
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

function initApplication() {
  const canvas = document.getElementsByTagName(
    'canvas',
  )[0] as HTMLCanvasElement | null;
  if (canvas) {
    setCanvas(canvas);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleMouseWheel);
    canvas.addEventListener('mouseout', handleMouseOut);
    canvas.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleWindowResize);

    handleWindowResize();

    const context = canvas.getContext('2d');
    if (!context) return;

    setContext(context);

    startDrawLoop(context, 0);

    toolActors[Tool.Line]?.start();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApplication();
});
