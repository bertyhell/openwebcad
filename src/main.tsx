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
  getScreenMouseLocation,
  getScreenOffset,
  getScreenZoom,
  getShouldDrawHelpers,
  getSnapPoint,
  getSnapPointOnAngleGuide,
  getWorldMouseLocation,
  redo,
  setActiveEntity,
  setActiveToolActor,
  setAngleGuideEntities,
  setCanvas,
  setCanvasSize,
  setContext,
  setHighlightedEntityIds,
  setHoveredSnapPoints,
  setLastDrawTimestamp,
  setPanStartLocation,
  setScreenMouseLocation,
  setScreenOffset,
  setScreenZoom,
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
import { toolStateMachines } from './tools/tool.consts.ts';
import { ActorEvent, DrawEvent, MouseClickEvent } from './tools/tool.types.ts';
import { Actor } from 'xstate';
import { lineToolStateMachine } from './tools/line-tool.ts';
import { circleToolStateMachine } from './tools/circle-tool.ts';
import { rectangleToolStateMachine } from './tools/rectangle-tool.ts';
import { selectToolStateMachine } from './tools/select-tool.ts';
import { moveToolStateMachine } from './tools/move-tool.ts';

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
  const screenScale = getScreenZoom();
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
  if (getActiveToolActor()?.getSnapshot()?.context.type === Tool.SELECT) {
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
  const screenScale = getScreenZoom();
  const worldMouseLocationBeforeZoom = getWorldMouseLocation();
  const newScreenScale =
    screenScale *
    (1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)));
  setScreenZoom(newScreenScale);

  // now get the location of the cursor in world space again
  // It will have changed because the scale has changed,
  // but we can offset our world now to fix the zoom location in screen space,
  // because we know how much it changed laterally between the two spatial scales.
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
      SNAP_POINT_DISTANCE / getScreenZoom(),
    );

    const worldMouseLocationTemp = screenToWorld(
      new Point(evt.clientX, evt.clientY),
    );
    const worldClickPoint = closestSnapPoint
      ? closestSnapPoint.point
      : worldMouseLocationTemp;

    const activeToolActor = getActiveToolActor();
    activeToolActor?.send({
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
    getActiveToolActor()?.send({
      type: ActorEvent.ESC,
    });
  } else if (evt.key === 'Enter') {
    evt.preventDefault();
    getActiveToolActor()?.send({
      type: ActorEvent.ENTER,
    });
  } else if (evt.key === 'Delete') {
    evt.preventDefault();
    getActiveToolActor()?.send({
      type: ActorEvent.DELETE,
    });
  } else if (evt.key === 'z' && evt.ctrlKey && !evt.shiftKey) {
    evt.preventDefault();
    undo();
    setActiveEntity(null);
    setSelectedEntityIds([]);
    getActiveToolActor()?.send({
      type: ActorEvent.ESC,
    });
  } else if (evt.key === 'z' && evt.ctrlKey && evt.shiftKey) {
    evt.preventDefault();
    redo();
    setActiveEntity(null);
    setSelectedEntityIds([]);
    getActiveToolActor()?.send({
      type: ActorEvent.ESC,
    });
  } else if (evt.key === 'l') {
    evt.preventDefault();
    setActiveToolActor(new Actor(lineToolStateMachine));
  } else if (evt.key === 'c') {
    evt.preventDefault();
    setActiveToolActor(new Actor(circleToolStateMachine));
  } else if (evt.key === 'r') {
    evt.preventDefault();
    setActiveToolActor(new Actor(rectangleToolStateMachine));
  } else if (evt.key === 's') {
    evt.preventDefault();
    setActiveToolActor(new Actor(selectToolStateMachine));
  } else if (evt.key === 'm') {
    evt.preventDefault();
    setActiveToolActor(new Actor(moveToolStateMachine));
  }
}

/**
 * Calculate angle guides and snap points
 */
function calculateAngleGuidesAndSnapPoints() {
  const angleStep = getAngleStep();
  const entities = getEntities();
  const screenScale = getScreenZoom();
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
  context: CanvasRenderingContext2D,
  timestamp: DOMHighResTimeStamp,
) {
  const canvasSize = getCanvasSize();
  const screenMouseLocation = getScreenMouseLocation();
  const worldMouseLocation = getWorldMouseLocation();
  const screenScale = getScreenZoom();
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

  if (getActiveToolActor()?.getSnapshot().can({ type: ActorEvent.DRAW })) {
    getActiveToolActor()?.send({
      type: ActorEvent.DRAW,
      drawInfo,
    } as DrawEvent);
  }

  /**
   * Highlight the entity closest to the mouse when the select tool is active
   */
  if (getActiveToolActor()?.getSnapshot()?.context?.type === Tool.SELECT) {
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
    SNAP_POINT_DISTANCE / getScreenZoom(),
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

    const lineToolActor = new Actor(toolStateMachines[Tool.LINE]);
    lineToolActor.start();
    setActiveToolActor(lineToolActor);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApplication();
});
