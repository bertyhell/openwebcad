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
  getDebugEntities,
  getEntities,
  getHoveredSnapPoints,
  getPanStartLocation,
  getScreenMouseLocation,
  getScreenOffset,
  getScreenScale,
  getShouldDrawCursor,
  getSnapPoint,
  getSnapPointOnAngleGuide,
  getWorldMouseLocation,
  setActiveEntity,
  setCanvas,
  setCanvasSize,
  setContext,
  setEntities,
  setPanStartLocation,
  setScreenMouseLocation,
  setScreenOffset,
  setScreenScale,
  setShouldDrawCursor,
} from './state.ts';
import { DrawInfo, MouseButton, SnapPoint } from './App.types.ts';
import { Entity } from './entities/Entitity.ts';
import { Tool } from './tools.ts';
import { Point } from '@flatten-js/core';
import { getDrawHelpers } from './helpers/get-draw-guides.ts';
import { compact } from './helpers/compact.ts';
import {
  HIGHLIGHT_ENTITY_DISTANCE,
  MOUSE_ZOOM_MULTIPLIER,
  SNAP_POINT_DISTANCE,
} from './App.consts.ts';
import { draw } from './helpers/draw.ts';
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import { handleLineToolClick } from './helpers/tools/line-tool.ts';
import { handleRectangleToolClick } from './helpers/tools/rectangle-tool.ts';
import { handleCircleToolClick } from './helpers/tools/circle-tool.ts';
import { handleSelectToolClick } from './helpers/tools/select-tool.ts';
import { getClosestSnapPointWithinRadius } from './helpers/get-closest-snap-point.ts';
import { deSelectAndDeHighlightEntities } from './helpers/select-entities.ts';
import { findClosestEntity } from './helpers/find-closest-entity.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

function handleMouseEnter() {
  setShouldDrawCursor(true);
}

function handleMouseMove(evt: MouseEvent) {
  const screenOffset = getScreenOffset();

  setShouldDrawCursor(true);
  setScreenMouseLocation(new Point(evt.clientX, evt.clientY));

  const panStartLocation = getPanStartLocation();
  const screenScale = getScreenScale();
  // If we are not dragging with the middle mouse button => do not pan the screen
  if (!panStartLocation) return screenOffset;

  // Pan the screen by the last mouse movement
  const newOffset = new Point(
    screenOffset.x - (evt.clientX - panStartLocation.x) / screenScale,
    screenOffset.y - (evt.clientY - panStartLocation.y) / screenScale,
  );
  console.log('mouse move middle mouse button', {
    x: evt.clientX,
    y: evt.clientY,
    newOffset,
  });
  setPanStartLocation(new Point(evt.clientX, evt.clientY));
  setScreenOffset(newOffset);
}

function handleMouseOut() {
  // setShouldDrawCursor(false);
}

/**
 * Change the zoom level of screen space
 * @param evt
 */
function handleMouseWheel(evt: WheelEvent) {
  console.log('mouse wheel', {
    deltaY: evt.deltaY,
    multiplier: 1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)),
  });
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
  const worldMouseLocationAfterZoom = screenToWorld(
    getScreenMouseLocation(),
    screenOffset,
    newScreenScale,
  );

  console.log('mouse wheel', {
    deltaY: evt.deltaY,
    multiplier: 1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)),
    worldMouseLocationBeforeZoom,
    worldMouseLocationAfterZoom,
    screenOffset,
    newScreenOffset: new Point(
      screenOffset.x +
        worldMouseLocationBeforeZoom.x -
        worldMouseLocationAfterZoom.x,
      screenOffset.y +
        worldMouseLocationBeforeZoom.y -
        worldMouseLocationAfterZoom.y,
    ),
  });
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

  console.log('middle mouse button down', {
    x: evt.clientX,
    y: evt.clientY,
  });
  setPanStartLocation(new Point(evt.clientX, evt.clientY));
}

function handleMouseUp(evt: MouseEvent) {
  if (evt.button === MouseButton.Middle) {
    console.log('middle mouse button up', {
      x: evt.clientX,
      y: evt.clientY,
    });
    setPanStartLocation(null);
  }
  if (evt.button === MouseButton.Left) {
    const activeTool = getActiveTool();
    const entities = getEntities();
    const activeEntity = getActiveEntity();
    const snapPoint = getSnapPoint();
    const snapPointOnAngleGuide = getSnapPointOnAngleGuide();
    const worldMouseLocation = getWorldMouseLocation();
    const screenScale = getScreenScale();
    const screenOffset = getScreenOffset();
    console.log('mouse up', {
      activeTool,
      activeEntity,
      entities,
      mouse: {
        x: evt.clientX,
        y: evt.clientY,
      },
    });

    const closestSnapPoint = getClosestSnapPointWithinRadius(
      compact([snapPoint, snapPointOnAngleGuide]),
      worldMouseLocation,
      SNAP_POINT_DISTANCE / screenScale,
    );

    const worldMouseLocationTemp = screenToWorld(
      new Point(evt.clientX, evt.clientY),
      screenOffset,
      screenScale,
    );
    const worldClickPoint = closestSnapPoint
      ? closestSnapPoint.point
      : worldMouseLocationTemp;

    handleMouseUpPoint(worldClickPoint, evt.ctrlKey, evt.shiftKey);
  }
}

function handleKeyUp(evt: KeyboardEvent) {
  const entities = getEntities();

  if (evt.key === 'Escape') {
    setActiveEntity(null);
    setEntities(deSelectAndDeHighlightEntities(entities));
  } else if (evt.key === 'Delete') {
    setEntities(entities.filter(entity => !entity.isSelected));
  }
}

function startDrawLoop(context: CanvasRenderingContext2D) {
  const activeTool = getActiveTool();
  const angleStep = getAngleStep();
  const activeEntity = getActiveEntity();
  let entities = getEntities();
  const canvasSize = getCanvasSize();
  const screenMouseLocation = getScreenMouseLocation();
  const hoveredSnapPoints = getHoveredSnapPoints();
  const worldMouseLocation = getWorldMouseLocation();
  const screenScale = getScreenScale();
  const screenOffset = getScreenOffset();
  const shouldDrawCursor = getShouldDrawCursor();
  const debugEntities = getDebugEntities();

  const drawInfo: DrawInfo = {
    context,
    canvasSize,
    worldMouseLocation: worldMouseLocation,
    screenMouseLocation: screenMouseLocation,
    screenOffset,
    screenZoom: screenScale,
  };
  let helperEntitiesTemp: Entity[] = [];
  let snapPointTemp: SnapPoint | null = null;
  let snapPointOnAngleGuideTemp: SnapPoint | null = null;

  /**
   * Highlight the entity closest to the mouse when the select tool is active
   */
  if (activeTool === Tool.Select) {
    const newEntities = [...entities];
    newEntities.forEach(entity => {
      entity.isHighlighted = false;
    });
    const [distance, , closestEntity] = findClosestEntity(
      screenToWorld(screenMouseLocation, screenOffset, screenScale),
      entities,
    );

    if (distance < HIGHLIGHT_ENTITY_DISTANCE) {
      closestEntity.isHighlighted = true;
    }
    setEntities(newEntities);
  }
  entities = getEntities();

  /**
   * Calculate angle guides and snap points
   */
  if ([Tool.Line, Tool.Rectangle, Tool.Circle].includes(activeTool)) {
    // If you're in the progress of drawing a shape, show the angle guides and closest snap point
    let firstPoint: Point | null = null;
    if (
      activeEntity &&
      !activeEntity.getShape() &&
      activeEntity.getFirstPoint()
    ) {
      firstPoint = activeEntity.getFirstPoint();
    }
    const { angleGuides, entitySnapPoint, angleSnapPoint } = getDrawHelpers(
      entities,
      compact([
        firstPoint,
        ...hoveredSnapPoints.map(
          hoveredSnapPoint => hoveredSnapPoint.snapPoint.point,
        ),
      ]),
      worldMouseLocation,
      angleStep,
      SNAP_POINT_DISTANCE / screenScale,
    );
    helperEntitiesTemp = angleGuides;
    snapPointTemp = entitySnapPoint;
    snapPointOnAngleGuideTemp = angleSnapPoint;
    // setHelperEntities(angleGuides);
    // setSnapPoint(entitySnapPoint);
    // setSnapPointOnAngleGuide(angleSnapPoint);
  }

  /**
   * Draw everything on the canvas
   */
  draw(
    drawInfo,
    entities,
    debugEntities,
    helperEntitiesTemp,
    getActiveEntity(),
    snapPointTemp,
    snapPointOnAngleGuideTemp,
    hoveredSnapPoints,
    worldMouseLocation,
    shouldDrawCursor,
  );

  requestAnimationFrame(() => {
    startDrawLoop(context);
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

function handleMouseUpPoint(
  worldClickPoint: Point,
  holdingCtrl: boolean,
  holdingShift: boolean,
) {
  if (getActiveTool() === Tool.Line) {
    handleLineToolClick(worldClickPoint);
  }

  if (getActiveTool() === Tool.Rectangle) {
    handleRectangleToolClick(worldClickPoint);
  }

  if (getActiveTool() === Tool.Circle) {
    handleCircleToolClick(worldClickPoint);
  }

  if (getActiveTool() === Tool.Select) {
    handleSelectToolClick(worldClickPoint, holdingCtrl, holdingShift);
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

    startDrawLoop(context);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApplication();
});
