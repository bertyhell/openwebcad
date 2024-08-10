import { createRef, MouseEvent, useCallback, useEffect, useState } from 'react';
import './App.scss';
import { Tool } from './tools.ts';
import { Entity } from './entities/Entitity.ts';
import { LineEntity } from './entities/LineEntity.ts';
import { RectangleEntity } from './entities/RectangleEntity.ts';
import { CircleEntity } from './entities/CircleEntity.ts';
import { SelectionRectangleEntity } from './entities/SelectionRectangleEntity.ts';
import { Box, Point } from '@flatten-js/core';
import { DrawInfo, HoverPoint, SnapPoint } from './App.types.ts';
import {
  HIGHLIGHT_ENTITY_DISTANCE,
  HOVERED_SNAP_POINT_TIME,
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
import { getDrawHelpers } from './helpers/get-draw-guides.ts';
import { pointDistance } from './helpers/distance-between-points.ts';
import { compact } from './helpers/compact.ts';
import { getClosestSnapPoint } from './helpers/get-closest-snap-point.ts';

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
      let activeLine = activeEntity as LineEntity | null;
      if (!activeLine) {
        // Start a new line
        activeLine = new LineEntity();
        setActiveEntity(activeLine);
      }
      const completed = activeLine.send(mousePoint);

      if (completed) {
        // Finish the line
        setEntities([...entities, activeLine]);

        // Start a new line from the endpoint of the last line
        activeLine = new LineEntity();
        setActiveEntity(activeLine);
        activeLine.send(new Point(mousePoint.x, mousePoint.y));
      }
    }
    if (activeTool === Tool.Rectangle) {
      let activeRectangle = activeEntity as RectangleEntity | null;
      if (!activeRectangle) {
        // Start a new rectangle
        activeRectangle = new RectangleEntity();
        setActiveEntity(activeRectangle);
      }
      const completed = activeRectangle.send(
        new Point(mousePoint.x, mousePoint.y),
      );

      if (completed) {
        // Finish the rectangle
        setEntities([...entities, activeRectangle]);
        setActiveEntity(null);
      }
    }

    if (activeTool === Tool.Circle) {
      let activeCircle = activeEntity as CircleEntity | null;
      if (!activeCircle) {
        // Start a new rectangle
        activeCircle = new CircleEntity();
        setActiveEntity(activeCircle);
      }
      const completed = activeCircle.send(
        new Point(mousePoint.x, mousePoint.y),
      );

      if (completed) {
        // Finish the rectangle
        setEntities([...entities, activeCircle]);
        setActiveEntity(null);
      }
    }

    if (activeTool === Tool.Select) {
      deHighlightEntities();

      let activeSelectionRectangle = null;
      if (activeEntity instanceof SelectionRectangleEntity) {
        activeSelectionRectangle = activeEntity as SelectionRectangleEntity;
      }

      const closestEntityInfo = findClosestEntity(mousePoint, entities);

      // Mouse is close to entity and is not dragging a rectangle
      if (
        closestEntityInfo &&
        closestEntityInfo[0] < HIGHLIGHT_ENTITY_DISTANCE &&
        !activeSelectionRectangle
      ) {
        // Select the entity close to the mouse
        const closestEntity = closestEntityInfo[2];
        console.log('selecting entity close to the mouse: ', closestEntity);
        if (!holdingCtrl && !holdingShift) {
          deSelectEntities();
        }
        if (holdingCtrl) {
          closestEntity.isSelected = !closestEntity.isSelected;
        } else {
          closestEntity.isSelected = true;
        }
        draw();
        return;
      }

      // No elements are close to the mouse and no selection dragging is in progress
      if (!activeSelectionRectangle) {
        console.log(
          'Start a new selection rectangle drag: ',
          activeSelectionRectangle,
        );
        // Start a new selection rectangle drag
        activeSelectionRectangle = new SelectionRectangleEntity();
        setActiveEntity(activeSelectionRectangle); // TODO make selection a separate concept from entities
      }

      const completed = activeSelectionRectangle.send(
        new Point(mousePoint.x, mousePoint.y),
      );

      deHighlightEntities();
      if (completed) {
        // Finish the selection
        console.log('Finish selection: ', activeSelectionRectangle);
        const intersectionSelection =
          activeSelectionRectangle.isIntersectionSelection();
        entities.forEach(entity => {
          if (intersectionSelection) {
            if (
              entity.intersectsWithBox(
                activeSelectionRectangle.getBoundingBox() as Box,
              ) ||
              entity.isContainedInBox(
                activeSelectionRectangle.getBoundingBox() as Box,
              )
            ) {
              if (holdingCtrl) {
                entity.isSelected = !entity.isSelected;
              } else {
                entity.isSelected = true;
              }
            } else {
              if (!holdingCtrl && !holdingShift) {
                entity.isSelected = false;
              }
            }
          } else {
            if (
              entity.isContainedInBox(
                activeSelectionRectangle.getBoundingBox() as Box,
              )
            ) {
              if (holdingCtrl) {
                entity.isSelected = !entity.isSelected;
              } else {
                entity.isSelected = true;
              }
            } else {
              if (!holdingCtrl && !holdingShift) {
                entity.isSelected = false;
              }
            }
          }
        });

        console.log('Set active entity to null');
        setActiveEntity(null);
      }
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

    const [, closestSnapPoint] = getClosestSnapPoint(
      compact([snapPoint, snapPointOnAngleGuide]),
      mouseLocation,
    );

    handleMouseUpPoint(
      closestSnapPoint
        ? closestSnapPoint.point
        : new Point(evt.clientX, evt.clientY),
      evt.ctrlKey,
      evt.shiftKey,
    );
  }

  const deHighlightEntities = useCallback(() => {
    setEntities((oldEntities: Entity[]) => {
      return oldEntities.map(entity => {
        entity.isHighlighted = false;
        return entity;
      });
    });
  }, []);

  const deSelectEntities = useCallback(() => {
    setEntities(oldEntities => {
      return oldEntities.map(entity => {
        entity.isSelected = false;
        return entity;
      });
    });
  }, []);

  const handleKeyUp = useCallback(
    (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        setActiveEntity(null);
        deSelectEntities();
        deHighlightEntities();
      } else if (evt.key === 'Delete') {
        setEntities(oldEntities =>
          oldEntities.filter(entity => !entity.isSelected),
        );
      }
    },
    [deHighlightEntities, deSelectEntities],
  );

  const handleToolClick = useCallback(
    (tool: Tool) => {
      console.log('set active tool: ', tool);
      setActiveTool(tool);
      setActiveEntity(null);
      deSelectEntities();
    },
    [deSelectEntities],
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
    console.log('drawing snap point: ', snapPoint);
    console.log('drawing snap point angle: ', snapPointOnAngleGuide);
    drawSnapPoint(drawInfo, closestSnapPoint);

    drawCursor(drawInfo, shouldDrawCursor);
  }, [
    activeEntity,
    canvasRef,
    canvasSize,
    debugEntities,
    entities,
    helperEntities,
    mouseLocation,
    shouldDrawCursor,
    snapPoint,
    snapPointOnAngleGuide,
  ]);

  /**
   * Checks the current snap point every 100ms to mark certain snap points when they are hovered for a certain amount of time (marked)
   * So we can show extra angle guides for the ones that are marked
   */
  const watchSnapPoint = useCallback(() => {
    if (!snapPoint) {
      return;
    }

    const lastHoveredPoint = hoveredSnapPoints.at(-1);
    let newHoverSnapPoints: HoverPoint[];

    // Angle guide points should never be marked
    console.log('snap point: ', JSON.stringify(snapPoint));

    if (lastHoveredPoint) {
      if (
        pointDistance(snapPoint.point, lastHoveredPoint.snapPoint.point) <
        SNAP_POINT_DISTANCE
      ) {
        console.log(
          'INCREASE HOVER TIME: ',
          JSON.stringify({
            ...lastHoveredPoint,
            milliSecondsHovered: lastHoveredPoint.milliSecondsHovered + 100,
          }),
        );
        // Last hovered snap point is still the current closest snap point
        // Increase the hover time
        newHoverSnapPoints = [
          ...hoveredSnapPoints.slice(0, hoveredSnapPoints.length - 1),
          {
            ...lastHoveredPoint,
            milliSecondsHovered: lastHoveredPoint.milliSecondsHovered + 100,
          },
        ];
      } else {
        // The closest snap point has changed
        // Check if the last snap point was hovered for long enough to be considered a marked snap point
        if (lastHoveredPoint.milliSecondsHovered >= HOVERED_SNAP_POINT_TIME) {
          console.log(
            'NEW HOVERED SNAP POINT: ',
            JSON.stringify({
              snapPoint,
              milliSecondsHovered: 100,
            }),
          );
          // Append the new point to the list
          newHoverSnapPoints = [
            ...hoveredSnapPoints,
            {
              snapPoint,
              milliSecondsHovered: 100,
            },
          ];
        } else {
          console.log(
            'REPLACE HOVERED SNAP POINT: ',
            JSON.stringify({
              snapPoint,
              milliSecondsHovered: 100,
            }),
          );
          // Replace the last point with the new point
          newHoverSnapPoints = [
            ...hoveredSnapPoints.slice(0, hoveredSnapPoints.length - 1),
            {
              snapPoint,
              milliSecondsHovered: 100,
            },
          ];
        }
      }
    } else {
      console.log(
        'BRAND NEW HOVERED SNAP POINT: ',
        JSON.stringify({
          snapPoint,
          milliSecondsHovered: 100,
        }),
        lastHoveredPoint,
      );
      // No snap points were hovered before
      newHoverSnapPoints = [
        {
          snapPoint,
          milliSecondsHovered: 100,
        },
      ];
    }

    const newHoverSnapPointsTruncated = newHoverSnapPoints.slice(0, 3);
    console.log('hovered snap points: ', newHoverSnapPointsTruncated);
    setHoveredSnapPoints(newHoverSnapPointsTruncated);
  }, [snapPoint, hoveredSnapPoints]);

  useEffect(() => {
    console.log('init app');
    window.document.addEventListener('keyup', handleKeyUp);
    window.document.addEventListener('resize', handleWindowResize);

    handleWindowResize();

    setActiveTool(Tool.Line);

    return () => {
      window.document.removeEventListener('keyup', handleKeyUp);
      window.document.removeEventListener('resize', handleWindowResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const watchSnapPointTimerId = setInterval(() => {
      watchSnapPoint();
    }, 1000);
    return () => {
      clearInterval(watchSnapPointTimerId);
    };
  }, [watchSnapPoint]);

  useEffect(() => {
    draw();
  }, [canvasSize.x, canvasSize.y, mouseLocation.x, mouseLocation.y, draw]);

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

  useEffect(() => {
    if (activeTool === Tool.Select) {
      deHighlightEntities();

      const closestEntityInfo = findClosestEntity(mouseLocation, entities);

      const [distance, , closestEntity] = closestEntityInfo;
      if (distance < HIGHLIGHT_ENTITY_DISTANCE) {
        closestEntity.isHighlighted = true;
      }
    }
  }, [activeTool, deHighlightEntities, debugEntities, entities, mouseLocation]);

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
