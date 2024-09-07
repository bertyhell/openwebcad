import { Point } from '@flatten-js/core';
import {
  getEntities,
  getSelectedEntityIds,
  setActiveEntity,
  setActiveTool,
  setEntities,
  setShouldDrawHelpers,
} from '../../state.ts';
import { toolHandlers } from './tool.consts.ts';
import { Tool } from '../../tools.ts';
import { ToolHandler } from './tool.types.ts';

let startPoint: Point | null = null;

export const moveToolHandler: ToolHandler = {
  handleToolActivate: () => {
    console.log('activate move tool');
    setActiveTool(Tool.Move);
    setActiveEntity(null);
    setShouldDrawHelpers(getSelectedEntityIds().length > 0);
  },

  handleToolClick: (
    worldClickPoint: Point,
    holdingCtrl: boolean,
    holdingShift: boolean,
  ) => {
    if (!getSelectedEntityIds().length) {
      // Nothing selected yet
      toolHandlers[Tool.Select].handleToolClick(
        worldClickPoint,
        holdingCtrl,
        holdingShift,
      );
      // If something was selected, draw helpers to select the start move point
      setShouldDrawHelpers(getSelectedEntityIds().length > 0);
    } else if (getSelectedEntityIds().length > 0 && !startPoint) {
      // Store point to use as the move start point
      startPoint = worldClickPoint;
    } else if (getSelectedEntityIds().length > 0 && !!startPoint) {
      // Move selected entities from start point to end point
      const endPoint = worldClickPoint;
      const movedEntities = getEntities().map(entity => {
        if (getSelectedEntityIds().includes(entity.id)) {
          return entity.move(
            endPoint.x - startPoint!.x,
            endPoint.y - startPoint!.y,
          );
        }
        return entity;
      });
      setEntities(movedEntities);
    } else {
      console.log('unhandled point for handle move tool click');
    }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('move tool typed command:', command);
  },
};
