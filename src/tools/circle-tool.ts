import { CircleEntity } from '../entities/CircleEntity.ts';
import { Point } from '@flatten-js/core';
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

export const circleToolHandler: ToolHandler = {
  handleToolActivate: () => {
    setActiveTool(Tool.Circle);
    setShouldDrawHelpers(true);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (worldClickPoint: Point) => {
    const entities = getEntities();
    const activeEntity = getActiveEntity();

    let activeCircle = activeEntity as CircleEntity | null;
    if (!activeCircle) {
      // Start a new rectangle
      activeCircle = new CircleEntity();
      activeCircle.lineColor = getActiveLineColor();
      activeCircle.lineWidth = getActiveLineWidth();
      setActiveEntity(activeCircle);
    }
    const completed = activeCircle.send(worldClickPoint);

    if (completed) {
      // Finish the rectangle
      setEntities([...entities, activeCircle]);
      setActiveEntity(null);
    }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('circle tool typed command:', command);
  },
};
