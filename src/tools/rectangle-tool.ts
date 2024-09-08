import { Point } from '@flatten-js/core';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import {
  getActiveEntity,
  getActiveLineColor,
  getActiveLineWidth,
  getEntities,
  setActiveEntity,
  setActiveTool,
  setEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { ToolHandler } from './tool.types.ts';
import { Tool } from '../tools.ts';

export const rectangleToolHandler: ToolHandler = {
  handleToolActivate: () => {
    setActiveTool(Tool.Rectangle);
    setShouldDrawHelpers(true);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (worldClickPoint: Point) => {
    const entities = getEntities();
    const activeEntity = getActiveEntity();

    let activeRectangle = activeEntity as RectangleEntity | null;
    if (!activeRectangle) {
      // Start a new rectangle
      activeRectangle = new RectangleEntity();
      activeRectangle.lineColor = getActiveLineColor();
      activeRectangle.lineWidth = getActiveLineWidth();
      setActiveEntity(activeRectangle);
    }
    const completed = activeRectangle.send(
      new Point(worldClickPoint.x, worldClickPoint.y),
    );

    if (completed) {
      // Finish the rectangle
      setEntities([...entities, activeRectangle]);
      setActiveEntity(null);
    }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('erase tool typed command:', command);
  },
};
