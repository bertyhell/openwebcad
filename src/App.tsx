import {
  createRef,
  MouseEvent,
  useCallback,
  useEffect,
  useState,
  WheelEvent,
} from 'react';
import './App.scss';
import { Tool } from './tools.ts';
import { Entity } from './entities/Entitity.ts';
import { Point } from '@flatten-js/core';
import { DrawInfo, HoverPoint, MouseButton, SnapPoint } from './App.types.ts';
import {
  HIGHLIGHT_ENTITY_DISTANCE,
  MOUSE_ZOOM_MULTIPLIER,
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
import { screenToWorld } from './helpers/world-screen-conversion.ts';
import { LineEntity } from './entities/LineEntity.ts';

function App() {
  const [canvasSize, setCanvasSize] = useState<Point>(new Point(0, 0));
  const [screenMouseLocation, setScreenMouseLocation] = useState<Point>(
    new Point(0, 0),
  );
  const canvasRef = createRef<HTMLCanvasElement>();
  const [activeTool, setActiveTool] = useState(Tool.Line);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);
  const [shouldDrawCursor, setShouldDrawCursor] = useState(false);
  const [helperEntities, setHelperEntities] = useState<Entity[]>([
    new LineEntity(new Point(0, 0), new Point(0, 1000)),
    new LineEntity(new Point(0, 0), new Point(1000, 0)),
    new LineEntity(new Point(100, 0), new Point(100, 1000)),
    new LineEntity(new Point(0, 100), new Point(1000, 100)),
  ]);
  const [debugEntities] = useState<Entity[]>([]);
  const [angleStep, setAngleStep] = useState(45);
  const [screenOffset, setScreenOffset] = useState<Point>(new Point(0, 0));
  const [screenScale, setScreenScale] = useState<number>(1);
  const [panStartLocation, setPanStartLocation] = useState<Point | null>(null);

  // computed
  const worldMouseLocation = screenToWorld(
    screenMouseLocation,
    screenOffset,
    screenScale,
  );

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
    console.log('handle window resize', {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    setCanvasSize(new Point(window.innerWidth, window.innerHeight));
  };

  function handleMouseUpPoint(
    worldClickPoint: Point,
    holdingCtrl: boolean,
    holdingShift: boolean,
  ) {
    if (activeTool === Tool.Line) {
      handleLineToolClick(
        activeEntity,
        setActiveEntity,
        entities,
        setEntities,
        worldClickPoint,
      );
    }

    if (activeTool === Tool.Rectangle) {
      handleRectangleToolClick(
        activeEntity,
        setActiveEntity,
        entities,
        setEntities,
        worldClickPoint,
      );
    }

    if (activeTool === Tool.Circle) {
      handleCircleToolClick(
        activeEntity,
        setActiveEntity,
        entities,
        setEntities,
        worldClickPoint,
      );
    }

    if (activeTool === Tool.Select) {
      handleSelectToolClick(
        worldClickPoint,
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
    setScreenMouseLocation(new Point(evt.clientX, evt.clientY));

    setScreenOffset(oldOffset => {
      // If we are not dragging with the middle mouse button => do not pan the screen
      if (!panStartLocation) return oldOffset;

      // Pan the screen by the last mouse movement
      const newOffset = new Point(
        oldOffset.x - (evt.clientX - panStartLocation.x) / screenScale,
        oldOffset.y - (evt.clientY - panStartLocation.y) / screenScale,
      );
      console.log('mouse move middle mouse button', {
        x: evt.clientX,
        y: evt.clientY,
        newOffset,
      });
      setPanStartLocation(new Point(evt.clientX, evt.clientY));
      return newOffset;
    });
  }

  function handleMouseOut() {
    setShouldDrawCursor(false);
  }

  /**
   * Change the zoom level of screen space
   * @param evt
   */
  function handleMouseWheel(evt: WheelEvent<HTMLCanvasElement>) {
    console.log('mouse wheel', {
      deltaY: evt.deltaY,
      multiplier:
        1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)),
    });
    const worldMouseLocationBeforeZoom = worldMouseLocation;
    const newZoom =
      screenScale *
      (1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)));
    setScreenScale(
      oldZoom =>
        oldZoom *
        (1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY))),
    );

    // ...now get the location of the cursor in world space again - It will have changed
    // because the scale has changed, but we can offset our world now to fix the zoom
    // location in screen space, because we know how much it changed laterally between
    // the two spatial scales. Neat huh? ;-)
    const worldMouseLocationAfterZoom = screenToWorld(
      screenMouseLocation,
      screenOffset,
      newZoom,
    );
    setScreenOffset(oldScreenOffset => {
      console.log('mouse wheel', {
        deltaY: evt.deltaY,
        multiplier:
          1 - MOUSE_ZOOM_MULTIPLIER * (evt.deltaY / Math.abs(evt.deltaY)),
        worldMouseLocationBeforeZoom,
        worldMouseLocationAfterZoom,
        oldScreenOffset,
        newScreenOffset: new Point(
          oldScreenOffset.x +
            worldMouseLocationBeforeZoom.x -
            worldMouseLocationAfterZoom.x,
          oldScreenOffset.y +
            worldMouseLocationBeforeZoom.y -
            worldMouseLocationAfterZoom.y,
        ),
      });
      return new Point(
        oldScreenOffset.x +
          (worldMouseLocationBeforeZoom.x - worldMouseLocationAfterZoom.x),
        oldScreenOffset.y +
          (worldMouseLocationBeforeZoom.y - worldMouseLocationAfterZoom.y),
      );
    });
  }

  function handleMouseDown(evt: MouseEvent<HTMLCanvasElement>) {
    if (evt.button !== MouseButton.Middle) return;

    console.log('middle mouse button down', {
      x: evt.clientX,
      y: evt.clientY,
    });
    setPanStartLocation(new Point(evt.clientX, evt.clientY));
  }

  function handleMouseUp(evt: MouseEvent<HTMLCanvasElement>) {
    if (evt.button === MouseButton.Middle) {
      console.log('middle mouse button up', {
        x: evt.clientX,
        y: evt.clientY,
      });
      setPanStartLocation(null);
    }
    if (evt.button === MouseButton.Left) {
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

  const draw = useCallback(
    (context: CanvasRenderingContext2D) => {
      const drawInfo: DrawInfo = {
        context,
        canvasSize,
        worldMouseLocation: worldMouseLocation,
        screenMouseLocation: screenMouseLocation,
        screenOffset,
        screenZoom: screenScale,
      };

      clearCanvas(drawInfo);

      drawHelpers(drawInfo, helperEntities);
      drawEntities(drawInfo, entities);
      drawDebugEntities(drawInfo, debugEntities);
      drawActiveEntity(drawInfo, activeEntity);

      const [, closestSnapPoint] = getClosestSnapPoint(
        compact([snapPoint, snapPointOnAngleGuide]),
        worldMouseLocation,
      );
      const isMarked =
        !!closestSnapPoint &&
        hoveredSnapPoints.some(hoveredSnapPoint =>
          isPointEqual(
            hoveredSnapPoint.snapPoint.point,
            closestSnapPoint.point,
          ),
        );
      // console.log('isMarked: ', isMarked);
      drawSnapPoint(drawInfo, closestSnapPoint, isMarked);

      drawCursor(drawInfo, shouldDrawCursor);
    },
    [
      activeEntity,
      canvasSize,
      debugEntities,
      entities,
      helperEntities,
      hoveredSnapPoints,
      screenMouseLocation,
      screenOffset,
      screenScale,
      shouldDrawCursor,
      snapPoint,
      snapPointOnAngleGuide,
      worldMouseLocation,
    ],
  );

  /**
   * Init the canvas and add event listeners
   */
  useEffect(() => {
    console.log('init app');
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleWindowResize);

    handleWindowResize();

    return () => {
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleWindowResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Keep track of the hovered snap points
   */
  useEffect(() => {
    const watchSnapPointTimerId = setInterval(() => {
      trackHoveredSnapPoint(
        snapPoint,
        hoveredSnapPoints,
        setHoveredSnapPoints,
        SNAP_POINT_DISTANCE / screenScale,
      );
    }, 100);
    return () => {
      clearInterval(watchSnapPointTimerId);
    };
  }, [hoveredSnapPoints, snapPoint]);

  /**
   * Redraw the canvas when the mouse moves or the window resizes
   */
  useEffect(() => {
    const context: CanvasRenderingContext2D | null | undefined =
      canvasRef.current?.getContext('2d');
    if (!context) return;

    draw(context);
  }, [
    canvasSize.x,
    canvasSize.y,
    screenMouseLocation.x,
    screenMouseLocation.y,
    draw,
    canvasRef,
  ]);

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
        worldMouseLocation,
        angleStep,
        SNAP_POINT_DISTANCE / screenScale,
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
    screenMouseLocation,
    screenOffset,
    screenScale,
    worldMouseLocation,
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
          screenToWorld(screenMouseLocation, screenOffset, screenScale),
          oldEntities,
        );

        if (distance < HIGHLIGHT_ENTITY_DISTANCE) {
          closestEntity.isHighlighted = true;
        }
        return newEntities;
      });
    }
  }, [activeTool, setEntities, screenMouseLocation, screenOffset, screenScale]);

  return (
    <div>
      <canvas
        width={canvasSize.x}
        height={canvasSize.y}
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleMouseWheel}
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
