import { createRef, MouseEvent, useCallback, useEffect, useState } from 'react';
import './App.scss';
import { Tool } from './tools.ts';
import { Entity } from './entities/Entitity.ts';
import { Point } from '@flatten-js/core';
import { DrawInfo, HoverPoint, SnapPoint } from './App.types.ts';
import {
  HIGHLIGHT_ENTITY_DISTANCE,
  SNAP_POINT_DISTANCE,
} from './App.consts.ts';
import {
  clearCanvas,
  drawActiveEntity,
  drawCursor,
  drawDebugEntities,
  drawEntities,
  drawHelpers,
  drawSnapPoint,
} from './helpers/draw-functions.ts';
import { Toolbar } from './components/Toolbar.tsx';
import { findClosestEntity } from './helpers/find-closest-entity.ts';
import { convertEntitiesToSvgString } from './helpers/export-entities-to-svg.ts';
import { saveAs } from 'file-saver';
import { compact } from './helpers/compact.ts';
import {
  getClosestSnapPoint,
  getClosestSnapPointWithinRadius,
} from './helpers/get-closest-snap-point.ts';
import { isPointEqual } from './helpers/is-point-equal.ts';
import { getDrawHelpers } from './helpers/get-draw-guides.ts';
import { trackHoveredSnapPoint } from './helpers/track-hovered-snap-points.ts';
import { handleSelectToolClick } from './helpers/tools/select-tool.ts';
import {
  deSelectAndDeHighlightEntities,
  deSelectEntities,
} from './helpers/select-entities.ts';
import { handleCircleToolClick } from './helpers/tools/circle-tool.ts';
import { handleRectangleToolClick } from './helpers/tools/rectangle-tool.ts';
import { handleLineToolClick } from './helpers/tools/line-tool.ts';

function App() {
  const [canvasSize, setCanvasSize] = useState<Point>(new Point(0, 0));
  const [mouseLocation, setMouseLocation] = useState<Point>(new Point(0, 0));
  const canvasRef = createRef<HTMLCanvasElement>();
  const [activeTool, setActiveTool] = useState(Tool.Line);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [shouldDrawCursor, setShouldDrawCursor] = useState(false);
  const [helperEntities, setHelperEntities] = useState<Entity[]>([]);
  const [debugEntities] = useState<Entity[]>([]);
  const [angleStep, setAngleStep] = useState(45);

  /**
   * Entity snap point or intersection
   */
  const [snapPoint, setSnapPoint] = useState<SnapPoint | null>(null);

  /**
   * Snap point on angle guide
   */
  const [snapPointOnAngleGuide, setSnapPointOnAngleGuide] =
    useState<SnapPoint | null>(null);

  /**
   * Snap points that are hovered for a certain amount of time
   */
  const [hoveredSnapPoints, setHoveredSnapPoints] = useState<HoverPoint[]>([]);

  const handleWindowResize = () => {
    setCanvasSize(new Point(window.innerWidth, window.innerHeight));
  };

  function handleMouseUpPoint(
    mousePoint: Point,
    holdingCtrl: boolean,
    holdingShift: boolean,
  ) {
    if (activeTool === Tool.Line) {
      handleLineToolClick(
        activeEntity,
        setActiveEntity,
        entities,
        setEntities,
        mousePoint,
      );
    }

    if (activeTool === Tool.Rectangle) {
      handleRectangleToolClick(
        activeEntity,
        setActiveEntity,
        entities,
        setEntities,
        mousePoint,
      );
    }

    if (activeTool === Tool.Circle) {
      handleCircleToolClick(
        activeEntity,
        setActiveEntity,
        entities,
        setEntities,
        mousePoint,
      );
    }

    if (activeTool === Tool.Select) {
      handleSelectToolClick(
        mousePoint,
        holdingCtrl,
        holdingShift,
        setEntities,
        activeEntity,
        setActiveEntity,
      );
    }
  }

  function handleMouseEnter() {
    setShouldDrawCursor(true);
  }

  function handleMouseMove(evt: MouseEvent<HTMLCanvasElement>) {
    setShouldDrawCursor(true);
    setMouseLocation(new Point(evt.clientX, evt.clientY));
  }

  function handleMouseOut() {
    setShouldDrawCursor(false);
  }

  function handleMouseUp(evt: MouseEvent<HTMLCanvasElement>) {
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
      mouseLocation,
      SNAP_POINT_DISTANCE,
    );

    handleMouseUpPoint(
      closestSnapPoint
        ? closestSnapPoint.point
        : new Point(evt.clientX, evt.clientY),
      evt.ctrlKey,
      evt.shiftKey,
    );
  }

  const handleKeyUp = useCallback((evt: KeyboardEvent) => {
    if (evt.key === 'Escape') {
      setActiveEntity(null);
      setEntities(oldEntities => deSelectAndDeHighlightEntities(oldEntities));
    } else if (evt.key === 'Delete') {
      setEntities(oldEntities =>
        oldEntities.filter(entity => !entity.isSelected),
      );
    }
  }, []);

  const handleToolClick = useCallback(
    (tool: Tool) => {
      console.log('set active tool: ', tool);
      setActiveTool(tool);
      setActiveEntity(null);
      setEntities(deSelectEntities(entities));
    },
    [entities],
  );

  const handleExportClick = useCallback(() => {
    const svgFileContent = convertEntitiesToSvgString(entities, canvasSize);

    const blob = new Blob([svgFileContent], { type: 'text/svg;charset=utf-8' });
    saveAs(blob, 'open-web-cad--drawing.svg');
  }, [canvasSize, entities]);

  const draw = useCallback(() => {
    const context: CanvasRenderingContext2D | null | undefined =
      canvasRef.current?.getContext('2d');
    if (!context) return;

    const drawInfo: DrawInfo = {
      context,
      canvasSize,
      mouse: new Point(mouseLocation.x, mouseLocation.y),
    };

    clearCanvas(drawInfo);

    drawHelpers(drawInfo, helperEntities);
    drawEntities(drawInfo, entities);
    drawDebugEntities(drawInfo, debugEntities);
    drawActiveEntity(drawInfo, activeEntity);

    const [, closestSnapPoint] = getClosestSnapPoint(
      compact([snapPoint, snapPointOnAngleGuide]),
      mouseLocation,
    );
    const isMarked =
      !!closestSnapPoint &&
      hoveredSnapPoints.some(hoveredSnapPoint =>
        isPointEqual(hoveredSnapPoint.snapPoint.point, closestSnapPoint.point),
      );
    // console.log('isMarked: ', isMarked);
    drawSnapPoint(drawInfo, closestSnapPoint, isMarked);

    drawCursor(drawInfo, shouldDrawCursor);
  }, [
    activeEntity,
    canvasRef,
    canvasSize,
    debugEntities,
    entities,
    helperEntities,
    hoveredSnapPoints,
    mouseLocation,
    shouldDrawCursor,
    snapPoint,
    snapPointOnAngleGuide,
  ]);

  /**
   * Init the canvas and add event listeners
   */
  useEffect(() => {
    console.log('init app');
    window.document.addEventListener('keyup', handleKeyUp);
    window.document.addEventListener('resize', handleWindowResize);

    handleWindowResize();

    return () => {
      window.document.removeEventListener('keyup', handleKeyUp);
      window.document.removeEventListener('resize', handleWindowResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keep track of the hovered snap points
   */
  useEffect(() => {
    const watchSnapPointTimerId = setInterval(() => {
      trackHoveredSnapPoint(snapPoint, hoveredSnapPoints, setHoveredSnapPoints);
    }, 100);
    return () => {
      clearInterval(watchSnapPointTimerId);
    };
  }, [hoveredSnapPoints, snapPoint]);

  /**
   * Redraw the canvas when the mouse moves or the window resizes
   */
  useEffect(() => {
    draw();
  }, [canvasSize.x, canvasSize.y, mouseLocation.x, mouseLocation.y, draw]);

  /**
   * Show the angle guides and closest snap point when drawing a shape
   */
  useEffect(() => {
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
        mouseLocation,
        angleStep,
      );
      setHelperEntities(angleGuides);
      setSnapPoint(entitySnapPoint);
      setSnapPointOnAngleGuide(angleSnapPoint);
    }
  }, [
    activeEntity,
    activeTool,
    angleStep,
    entities,
    hoveredSnapPoints,
    mouseLocation,
  ]);

  /**
   * Highlight the entity closest to the mouse when the select tool is active
   */
  useEffect(() => {
    if (activeTool === Tool.Select) {
      setEntities(oldEntities => {
        const newEntities = [...oldEntities];
        newEntities.forEach(entity => {
          entity.isHighlighted = false;
        });
        const [distance, , closestEntity] = findClosestEntity(
          mouseLocation,
          oldEntities,
        );

        if (distance < HIGHLIGHT_ENTITY_DISTANCE) {
          closestEntity.isHighlighted = true;
        }
        return newEntities;
      });
    }
  }, [activeTool, setEntities, mouseLocation]);

  return (
    <div>
      <canvas
        width={canvasSize.x}
        height={canvasSize.y}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseOut={handleMouseOut}
        onMouseEnter={handleMouseEnter}
      ></canvas>
      <Toolbar
        activeTool={activeTool}
        onToolClick={handleToolClick}
        activeAngle={angleStep}
        setActiveAngle={setAngleStep}
        onExportClick={handleExportClick}
      ></Toolbar>
    </div>
  );
}

export default App;
