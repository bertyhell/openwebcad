import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.scss';
import {
  getActiveToolActor,
  getAngleGuideOriginPoint,
  getAngleStep,
  getCanvas,
  getCanvasSize,
  getEntities,
  getHoveredSnapPoints,
  getLastDrawTimestamp,
  getPanStartLocation,
  getScreenCanvasDrawController,
  getShouldDrawHelpers,
  getSnapPoint,
  getSnapPointOnAngleGuide,
  setActiveToolActor,
  setAngleGuideEntities,
  setCanvas,
  setCanvasSize,
  setEntities,
  setHighlightedEntityIds,
  setHoveredSnapPoints,
  setInputController,
  setLastDrawTimestamp,
  setPanStartLocation,
  setScreenCanvasDrawController,
  setShouldDrawCursor,
  setSnapPoint,
  setSnapPointOnAngleGuide,
} from './state';
import { MouseButton } from './App.types';
import { Tool } from './tools';
import { Point } from '@flatten-js/core';
import { getDrawHelpers } from './helpers/get-draw-guides';
import {
  HIGHLIGHT_ENTITY_DISTANCE,
  HOVERED_SNAP_POINT_TIME,
  SNAP_POINT_DISTANCE,
} from './App.consts';
import { draw } from './helpers/draw';
import { getClosestSnapPointWithinRadius } from './helpers/get-closest-snap-point';
import { findClosestEntity } from './helpers/find-closest-entity';
import { trackHoveredSnapPoint } from './helpers/track-hovered-snap-points';
import { compact } from 'es-toolkit';
import { TOOL_STATE_MACHINES } from './tools/tool.consts';
import { ActorEvent, DrawEvent, MouseClickEvent } from './tools/tool.types';
import { Actor } from 'xstate';
import { ScreenCanvasDrawController } from './drawControllers/screenCanvas.drawController';
import { InputController } from './helpers/input-controller.ts';

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
  const newScreenMouseLocation = new Point(evt.clientX, evt.clientY);
  const screenCanvasDrawController = getScreenCanvasDrawController();
  screenCanvasDrawController.setScreenMouseLocation(newScreenMouseLocation);

  // If the middle mouse button is pressed, pan the screen
  const panStartLocation = getPanStartLocation();
  if (panStartLocation) {
    screenCanvasDrawController.panScreen(
      newScreenMouseLocation.x - panStartLocation.x,
      newScreenMouseLocation.y - panStartLocation.y,
    );
    setPanStartLocation(newScreenMouseLocation);
  }

  // Calculate angle guides and snap points
  calculateAngleGuidesAndSnapPoints();

  // Highlight the entity closest to the mouse when the select tool is active
  if (getActiveToolActor()?.getSnapshot()?.context.type === Tool.SELECT) {
    const closestEntityInfo = findClosestEntity(
      screenCanvasDrawController.screenToWorld(newScreenMouseLocation),
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
  const drawController = getScreenCanvasDrawController();
  drawController.zoomScreen(evt.deltaY);
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
    const screenCanvasDrawController = getScreenCanvasDrawController();
    const closestSnapPoint = getClosestSnapPointWithinRadius(
      compact([getSnapPoint(), getSnapPointOnAngleGuide()]),
      screenCanvasDrawController.getWorldMouseLocation(),
      SNAP_POINT_DISTANCE / screenCanvasDrawController.getScreenScale(),
    );

    const worldMouseLocationTemp =
      getScreenCanvasDrawController().screenToWorld(
        new Point(evt.clientX, evt.clientY),
      );
    const worldMouseLocation = closestSnapPoint
      ? closestSnapPoint.point
      : worldMouseLocationTemp;

    const activeToolActor = getActiveToolActor();
    activeToolActor?.send({
      type: ActorEvent.MOUSE_CLICK,
      worldMouseLocation,
      holdingCtrl: evt.ctrlKey,
      holdingShift: evt.shiftKey,
    } as MouseClickEvent);
  }
}

/**
 * Calculate angle guides and snap points
 */
function calculateAngleGuidesAndSnapPoints() {
  const angleStep = getAngleStep();
  const screenCanvasDrawController = getScreenCanvasDrawController();
  const entities = getEntities();
  const screenScale = screenCanvasDrawController.getScreenScale();
  const worldMouseLocation = screenCanvasDrawController.getWorldMouseLocation();
  const hoveredSnapPoints = getHoveredSnapPoints();

  const eligibleHoveredSnapPoints = hoveredSnapPoints.filter(
    hoveredSnapPoint =>
      hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME,
  );

  const eligibleHoveredPoints = eligibleHoveredSnapPoints.map(
    hoveredSnapPoint => hoveredSnapPoint.snapPoint.point,
  );

  if (getShouldDrawHelpers()) {
    const { angleGuides, entitySnapPoint, angleSnapPoint } = getDrawHelpers(
      entities,
      compact([getAngleGuideOriginPoint(), ...eligibleHoveredPoints]),
      worldMouseLocation,
      angleStep,
      SNAP_POINT_DISTANCE / screenScale,
    );
    setAngleGuideEntities(angleGuides);
    setSnapPoint(entitySnapPoint);
    setSnapPointOnAngleGuide(angleSnapPoint);
  }
}

function startDrawLoop(
  screenCanvasDrawController: ScreenCanvasDrawController,
  timestamp: DOMHighResTimeStamp,
) {
  const lastDrawTimestamp = getLastDrawTimestamp();

  const elapsedTime = timestamp - lastDrawTimestamp;
  setLastDrawTimestamp(timestamp);

  if (getActiveToolActor()?.getSnapshot().can({ type: ActorEvent.DRAW })) {
    getActiveToolActor()?.send({
      type: ActorEvent.DRAW,
      drawController: screenCanvasDrawController,
    } as DrawEvent);
  }

  /**
   * Highlight the entity closest to the mouse when the select tool is active
   */
  if (getActiveToolActor()?.getSnapshot()?.context?.type === Tool.SELECT) {
    const screenCanvasDrawController = getScreenCanvasDrawController();
    if (!screenCanvasDrawController) {
      throw new Error('getScreenCanvasDrawController() returned null');
    }
    const { distance, entity: closestEntity } = findClosestEntity(
      screenCanvasDrawController.getWorldMouseLocation(),
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
    SNAP_POINT_DISTANCE / screenCanvasDrawController.getScreenScale(),
    elapsedTime,
  );

  /**
   * Draw everything on the canvas
   */
  draw(screenCanvasDrawController);

  requestAnimationFrame((newTimestamp: DOMHighResTimeStamp) => {
    startDrawLoop(screenCanvasDrawController, newTimestamp);
  });
}

function handleWindowResize() {
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
    window.addEventListener('resize', handleWindowResize);
    const inputController = new InputController();
    setInputController(inputController);

    handleWindowResize();

    const context = canvas.getContext('2d');
    if (!context) return;

    setEntities([], true); // Creates the first undo entry
    const screenCanvasDrawController = new ScreenCanvasDrawController(
      context,
      getCanvasSize(),
    );
    setScreenCanvasDrawController(screenCanvasDrawController);
    startDrawLoop(screenCanvasDrawController, 0);

    const lineToolActor = new Actor(TOOL_STATE_MACHINES[Tool.LINE]);
    lineToolActor.start();
    setActiveToolActor(lineToolActor);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApplication();
});
