import { Point } from '@flatten-js/core';
import {
  getEntities,
  getSelectedEntityIds,
  setActiveEntity,
  setActiveTool,
  setEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { toolHandlers } from './tool.consts.ts';
import { Tool } from '../tools.ts';
import { ToolHandler } from './tool.types.ts';

let startPoint: Point | null = null;

// const moveToolStateMachine = createMachine(
//   {
//     context: {
//       startPoint: null,
//     },
//     initial: 'checkSelection',
//     states: {
//       checkSelection: {
//         always: [
//           {
//             guard: 'hasNoSelectedEntities',
//             target: '#drawingMachine.selectingEntities',
//           },
//           {
//             target: 'waitingForStartPoint',
//           },
//         ],
//       },
//       waitingForStartPoint: {
//         on: {
//           MOUSE_CLICK: {
//             actions: 'recordStartPoint',
//             target: 'waitingForEndPoint',
//           },
//           ESC: {
//             target: '#drawingMachine.selectingEntities',
//           },
//         },
//       },
//       waitingForEndPoint: {
//         on: {
//           MOUSE_CLICK: {
//             actions: 'moveEntities',
//             target: 'checkSelection',
//           },
//           ESC: {
//             target: 'checkSelection',
//           },
//         },
//       },
//     },
//   },
//   {
//     actions: {
//       selectEntity: assign((context, event) => {
//         // Logic to select an entity
//       }),
//       startDrawingRectangle: assign((context, event) => {
//         // Logic to start drawing a rectangle
//       }),
//       finishDrawingRectangle: assign((context, event) => {
//         // Logic to finish drawing a rectangle and select entities inside
//       }),
//       selectEntitiesInRectangle: assign((context, event) => {
//         // Logic to select entities inside the drawn rectangle
//       }),
//       recordStartPoint: assign((context, event) => {
//         return { startPoint: event.point };
//       }),
//       moveEntities: assign((context, event) => {
//         // Logic to move entities from startPoint to event.point
//         return { startPoint: null, endPoint: null };
//       }),
//     },
//     guards: {
//       isCloseToEntity: (context, event) => {
//         // Logic to determine if the click is close to an entity
//         return true;
//       },
//       hasNoSelectedEntities: (context, event) => {
//         return context.selectedEntities.length === 0;
//       },
//     },
//   },
// );

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
      startPoint = null;
      setSelectedEntityIds([]);
    } else {
      console.log('unhandled point for handle move tool click');
    }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('move tool typed command:', command);
  },
};
