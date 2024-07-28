import { createRef, MouseEvent, useCallback, useEffect, useState } from 'react';
import './App.scss';
import { Tool } from './tools.ts';
import { Entity } from './entities/Entitity.ts';
import { LineEntity } from './entities/LineEntity.ts';
import { Button } from './components/Button.tsx';
import { IconName } from './components/icon.tsx';
import { RectangleEntity } from './entities/RectangleEntity.ts';
import { CircleEntity } from './entities/CircleEntity.ts';
import { SelectionRectangleEntity } from './entities/SelectionRectangleEntity.ts';
import { Box, Point, Segment, Vector } from '@flatten-js/core';
import { DrawInfo, Shape } from './App.types.ts';
import { saveAs } from 'file-saver';
import {
  CANVAS_BACKGROUND_COLOR,
  CANVAS_FOREGROUND_COLOR,
  CURSOR_SIZE,
  SNAP_DISTANCE,
  SVG_MARGIN,
} from './App.consts.ts';

function App() {
  const [canvasSize, setCanvasSize] = useState<Point>(new Point(0, 0));
  const [mouseLocation, setMouseLocation] = useState<Point>(new Point(0, 0));
  const canvasRef = createRef<HTMLCanvasElement>();
  const [activeTool, setActiveTool] = useState(Tool.Line);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [activeEntity, setActiveEntity] = useState<Entity | null>(null);

  const handleWindowResize = () => {
    setCanvasSize(new Point(window.innerWidth, window.innerHeight));
  };

  function handleMouseMove(evt: MouseEvent<HTMLCanvasElement>) {
    setMouseLocation(new Point(evt.clientX, evt.clientY));
  }

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
      let activeSelectionRectangle =
        activeEntity as SelectionRectangleEntity | null;
      const highlightedEntity = entities.find(entity => entity.isHighlighted);

      if (highlightedEntity && !activeSelectionRectangle) {
        deHighlightEntities();
        if (!holdingCtrl && !holdingShift) {
          deSelectEntities();
        }
        if (holdingCtrl) {
          highlightedEntity.isSelected = !highlightedEntity.isSelected;
        } else {
          highlightedEntity.isSelected = true;
        }
        draw();
        return;
      }
      if (!activeSelectionRectangle) {
        // Start a new selection rectangle
        activeSelectionRectangle = new SelectionRectangleEntity();
        setActiveEntity(activeSelectionRectangle);
      }
      const completed = activeSelectionRectangle.send(
        new Point(mousePoint.x, mousePoint.y),
      );

      if (completed) {
        // Finish the selection
        deHighlightEntities();
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
        setActiveEntity(null);
      }
    }
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
      new Point(evt.clientX, evt.clientY),
      evt.ctrlKey,
      evt.shiftKey,
    );
  }

  function handleKeyUp(evt: KeyboardEvent) {
    if (evt.key === 'Escape') {
      setActiveEntity(null);
    } else if (evt.key === 'Delete') {
      setEntities(entities.filter(entity => !entity.isSelected));
    }
  }

  const deHighlightEntities = useCallback(() => {
    entities.forEach(entity => {
      entity.isHighlighted = false;
    });
  }, [entities]);

  const deSelectEntities = useCallback(() => {
    entities.forEach(entity => {
      entity.isSelected = false;
    });
  }, [entities]);

  const findClosestEntity = useCallback(
    (point: Point): [number, Segment, Entity] | null => {
      let closestEntity = null;
      let closestDistanceInfo: [number, Segment | null] = [
        Number.MAX_SAFE_INTEGER,
        null,
      ];
      entities.forEach(entity => {
        const distanceInfo = entity.distanceTo(point);
        if (!distanceInfo) return;
        if (distanceInfo[0] < closestDistanceInfo[0]) {
          closestDistanceInfo = distanceInfo;
          closestEntity = entity;
        }
      });
      if (!closestEntity) return null;
      if (!closestDistanceInfo[1]) return null;
      return [closestDistanceInfo[0], closestDistanceInfo[1], closestEntity];
    },
    [entities],
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
    let boundingBoxMinX = canvasSize.x;
    let boundingBoxMinY = canvasSize.y;
    let boundingBoxMaxX = 0;
    let boundingBoxMaxY = 0;
    const svgStrings: string[] = [];

    entities.forEach(entity => {
      const boundingBox = entity.getBoundingBox();
      if (boundingBox) {
        boundingBoxMinX = Math.min(boundingBoxMinX, boundingBox.xmin);
        boundingBoxMinY = Math.min(boundingBoxMinY, boundingBox.ymin);
        boundingBoxMaxX = Math.max(boundingBoxMaxX, boundingBox.xmax);
        boundingBoxMaxY = Math.max(boundingBoxMaxY, boundingBox.ymax);
      }
    });

    console.log('exporting svg', svgStrings);
    const boundingBoxWidth = boundingBoxMaxX - boundingBoxMinX + SVG_MARGIN * 2;
    const boundingBoxHeight =
      boundingBoxMaxY - boundingBoxMinY + SVG_MARGIN * 2;

    entities.forEach(entity => {
      const shape = entity.getShape();
      if (!shape) return;

      const translatedShape = shape.translate(
        new Vector(
          new Point(boundingBoxMinX, boundingBoxMinY),
          new Point(SVG_MARGIN, SVG_MARGIN),
        ),
      );
      const svgString = (translatedShape as Shape).svg();
      if (svgString) {
        svgStrings.push(svgString);
      }
    });

    // Patch for bug: https://github.com/alexbol99/flatten-js/pull/186/files
    const svgFileContent = `
      <svg width="${boundingBoxWidth}" height="${boundingBoxHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${boundingBoxWidth}" height="${boundingBoxHeight}" fill="white" />
        ${svgStrings
          .join('')
          ?.replace(/width=([0-9]+)/g, 'width="$1"')
          ?.replace(/height=([0-9]+)/g, 'height="$1"')}
      </svg>
    `;

    const blob = new Blob([svgFileContent], { type: 'text/svg;charset=utf-8' });
    saveAs(blob, 'open-web-cad--drawing.svg');
  }, [canvasSize.x, canvasSize.y, entities]);

  const clearCanvas = useCallback(() => {
    if (canvasSize === null) return;

    const context = canvasRef.current?.getContext('2d');
    if (!context) return;

    context.fillStyle = CANVAS_BACKGROUND_COLOR;
    context.fillRect(0, 0, canvasSize?.x, canvasSize?.y);
  }, [canvasSize, canvasRef]);

  const drawCursor = useCallback(
    (context: CanvasRenderingContext2D) => {
      setLineStyles(context, false, false);

      context.beginPath();
      context.moveTo(mouseLocation.x, mouseLocation.y - CURSOR_SIZE);
      context.lineTo(mouseLocation.x, mouseLocation.y + CURSOR_SIZE);
      context.moveTo(mouseLocation.x - CURSOR_SIZE, mouseLocation.y);
      context.lineTo(mouseLocation.x + CURSOR_SIZE, mouseLocation.y);
      context.stroke();
    },
    [mouseLocation.x, mouseLocation.y],
  );

  const setLineStyles = (
    context: CanvasRenderingContext2D,
    isHighlighted: boolean,
    isSelected: boolean,
  ) => {
    context.strokeStyle = CANVAS_FOREGROUND_COLOR;
    context.lineWidth = 1;
    context.setLineDash([]);

    if (isHighlighted) {
      context.lineWidth = 2;
    }

    if (isSelected) {
      context.setLineDash([5, 5]);
    }
  };

  const draw = useCallback(() => {
    const context: CanvasRenderingContext2D | null | undefined =
      canvasRef.current?.getContext('2d');
    if (!context) return;

    clearCanvas();

    drawCursor(context);

    const drawInfo: DrawInfo = {
      context,
      mouse: new Point(mouseLocation.x, mouseLocation.y),
    };
    entities.forEach(entity => {
      setLineStyles(context, entity.isHighlighted, entity.isSelected);
      entity.draw(drawInfo);
    });

    setLineStyles(context, false, false);
    activeEntity?.draw(drawInfo);
  }, [
    activeEntity,
    canvasRef,
    clearCanvas,
    drawCursor,
    entities,
    mouseLocation.x,
    mouseLocation.y,
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
  }, []);

  useEffect(() => {
    draw();
  }, [canvasSize.x, canvasSize.y, mouseLocation.x, mouseLocation.y, draw]);

  useEffect(() => {
    if (activeTool === Tool.Select) {
      const closestEntityInfo = findClosestEntity(mouseLocation);
      if (!closestEntityInfo) return;

      const [distance, , closestEntity] = closestEntityInfo;
      closestEntity.isHighlighted = distance < SNAP_DISTANCE;
    }
  }, [activeTool, findClosestEntity, mouseLocation]);

  return (
    <div>
      <canvas
        width={canvasSize.x}
        height={canvasSize.y}
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      ></canvas>
      <div className="controls absolute top-0 left-0 flex flex-col gap-1 m-1">
        <Button
          title="Select"
          icon={IconName.Direction}
          onClick={() => handleToolClick(Tool.Select)}
          active={activeTool === Tool.Select}
        />
        <Button
          title="Line"
          icon={IconName.Line}
          onClick={() => handleToolClick(Tool.Line)}
          active={activeTool === Tool.Line}
        />
        <Button
          title="Rectangle"
          icon={IconName.Square}
          onClick={() => handleToolClick(Tool.Rectangle)}
          active={activeTool === Tool.Rectangle}
        />
        <Button
          title="Circle"
          icon={IconName.Circle}
          onClick={() => handleToolClick(Tool.Circle)}
          active={activeTool === Tool.Circle}
        />
        <Button
          className="mt-2"
          title="Delete segments"
          icon={IconName.LayersDifference}
          onClick={() => handleToolClick(Tool.Eraser)}
          active={activeTool === Tool.Eraser}
        />
        <Button
          className="mt-2"
          title="Export SVG"
          icon={IconName.VectorDocument}
          onClick={() => handleExportClick()}
        />
      </div>
    </div>
  );
}

export default App;
