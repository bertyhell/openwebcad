import { Point } from '@flatten-js/core';
import { LineEntity } from '../../entities/LineEntity.ts';
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
} from '../../state.ts';
import { ToolHandler } from './tool.types.ts';
import { Tool } from '../../tools.ts';

export const lineToolHandler: ToolHandler = {
  handleToolActivate: () => {
    console.log('activate line tool');
    setActiveTool(Tool.Line);
    setShouldDrawHelpers(true);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (worldClickPoint: Point) => {
    console.log('line tool click:', worldClickPoint);
    const entities = getEntities();
    const activeEntity = getActiveEntity();

    let activeLine = activeEntity as LineEntity | null;
    if (!activeLine) {
      // Start a new line
      activeLine = new LineEntity();
      activeLine.lineColor = getActiveLineColor();
      activeLine.lineWidth = getActiveLineWidth();
      setActiveEntity(activeLine);
    }
    const completed = activeLine.send(worldClickPoint);

    if (completed) {
      // Finish the line
      setEntities([...entities, activeLine]);

      // Start a new line from the endpoint of the last line
      activeLine = new LineEntity();
      activeLine.lineColor = getActiveLineColor();
      activeLine.lineWidth = getActiveLineWidth();
      setActiveEntity(activeLine);
      activeLine.send(worldClickPoint);
    }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('erase tool typed command:', command);
  },
};
