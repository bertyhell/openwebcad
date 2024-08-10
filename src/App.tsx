import { createRef, MouseEvent, useCallback, useEffect, useState } from 'react';
import './App.scss';
import { Tool } from './tools.ts';
import { Entity } from './entities/Entitity.ts';
import { LineEntity } from './entities/LineEntity.ts';
import { RectangleEntity } from './entities/RectangleEntity.ts';
import { CircleEntity } from './entities/CircleEntity.ts';
import { SelectionRectangleEntity } from './entities/SelectionRectangleEntity.ts';
import { Box, Point } from '@flatten-js/core';
import { DrawInfo, SnapPoint } from './App.types.ts';
import { HIGHLIGHT_ENTITY_DISTANCE } from './App.consts.ts';
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
  const [snapPoint, setSnapPoint] = useState<SnapPoint | null>(null);

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
    handleMouseUpPoint(
      snapPoint ? snapPoint.point : new Point(evt.clientX, evt.clientY),
      evt.ctrlKey,
      evt.shiftKey,
    );
  }

  const deHighlightEntities = useCallback(() => {
    setEntities(
      entities.map(entity => {
        entity.isHighlighted = false;
        return entity;
      }),
    );
  }, [entities]);

  const deSelectEntities = useCallback(() => {
    setEntities(
      entities.map(entity => {
        entity.isSelected = false;
        return entity;
      }),
    );
  }, [entities]);

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
    drawSnapPoint(drawInfo, snapPoint);
    drawCursor(drawInfo, shouldDrawCursor);
  }, [
    activeEntity,
    canvasRef,
    canvasSize,
    debugEntities,
    entities,
    helperEntities,
    mouseLocation.x,
    mouseLocation.y,
    shouldDrawCursor,
    snapPoint,
  ]);

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
  }, [handleKeyUp]);

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
      const { angleGuide, snapPoint } = getDrawHelpers(
        entities,
        firstPoint,
        mouseLocation,
        angleStep,
      );
      setHelperEntities(angleGuide ? [angleGuide] : []);
      setSnapPoint(snapPoint);
    }
  }, [activeEntity, activeTool, angleStep, entities, mouseLocation]);

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
