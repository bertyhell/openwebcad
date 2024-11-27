import { Point } from '@flatten-js/core';
import {
  addEntities,
  setActiveToolActor,
  setAngleGuideEntities,
  setAngleGuideOriginPoint,
  setGhostHelperEntities,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { Actor, assign, createMachine } from 'xstate';
import {
  ActorEvent,
  DrawEvent,
  FileSelectedEvent,
  MouseClickEvent,
  PointInputEvent,
  StateEvent,
  ToolContext,
} from './tool.types';
import { ImageEntity } from '../entities/ImageEntity';
import { getContainRectangleInsideRectangle } from './image-import-tool.helpers';
import { RectangleEntity } from '../entities/RectangleEntity';
import { selectToolStateMachine } from './select-tool';
import { boxToPolygon, twoPointBoxToPolygon } from '../helpers/box-to-polygon';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';

export interface ImageImportContext extends ToolContext {
  startPoint: Point | null;
  imageElement: HTMLImageElement | null;
}

export enum ImageImportState {
  INIT = 'INIT',
  WAIT_FOR_IMAGE_DATA = 'WAIT_FOR_IMAGE_DATA',
  WAITING_FOR_START_POINT = 'WAITING_FOR_START_POINT',
  WAITING_FOR_END_POINT = 'WAITING_FOR_END_POINT',
}

export enum ImageImportAction {
  INIT_IMAGE_IMPORT_TOOL = 'INIT_IMAGE_IMPORT_TOOL',
  STORE_IMAGE_DATA = 'STORE_IMAGE_DATA',
  RECORD_START_POINT = 'RECORD_START_POINT',
  DRAW_TEMP_IMAGE_IMPORT = 'DRAW_TEMP_IMAGE_IMPORT',
  DRAW_FINAL_IMAGE_IMPORT = 'DRAW_FINAL_IMAGE_IMPORT',
  SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

export const imageImportToolStateMachine = createMachine(
  {
    types: {} as {
      context: ImageImportContext;
      events: StateEvent;
    },
    context: {
      type: Tool.IMAGE_IMPORT,
      startPoint: null,
      imageElement: null,
    },
    initial: ImageImportState.INIT,
    states: {
      [ImageImportState.INIT]: {
        description: 'Initializing the imageImport tool',
        always: {
          actions: ImageImportAction.INIT_IMAGE_IMPORT_TOOL,
          target: ImageImportState.WAIT_FOR_IMAGE_DATA,
        },
      },
      [ImageImportState.WAIT_FOR_IMAGE_DATA]: {
        description: 'Select an image file to import',
        meta: {
          instructions: 'Select an image file to import',
        },
        on: {
          [ActorEvent.FILE_SELECTED]: {
            actions: ImageImportAction.STORE_IMAGE_DATA,
            target: ImageImportState.WAITING_FOR_START_POINT,
          },
          ESC: {
            actions: ImageImportAction.SWITCH_TO_SELECT_TOOL,
          },
        },
      },
      [ImageImportState.WAITING_FOR_START_POINT]: {
        description: 'Select the start point of the imageImport',
        meta: {
          instructions: 'Select the start point of the imageImport',
        },
        on: {
          MOUSE_CLICK: {
            actions: ImageImportAction.RECORD_START_POINT,
            target: ImageImportState.WAITING_FOR_END_POINT,
          },
          ABSOLUTE_POINT_INPUT: {
            actions: ImageImportAction.RECORD_START_POINT,
            target: ImageImportState.WAITING_FOR_END_POINT,
          },
        },
      },
      [ImageImportState.WAITING_FOR_END_POINT]: {
        description: 'Select the end point of the imageImport',
        meta: {
          instructions: 'Select the end point of the imageImport',
        },
        on: {
          DRAW: {
            actions: ImageImportAction.DRAW_TEMP_IMAGE_IMPORT,
          },
          MOUSE_CLICK: {
            actions: [
              ImageImportAction.DRAW_FINAL_IMAGE_IMPORT,
              ImageImportAction.INIT_IMAGE_IMPORT_TOOL,
              ImageImportAction.SWITCH_TO_SELECT_TOOL,
            ],
          },
          NUMBER_INPUT: {
            actions: [
              ImageImportAction.DRAW_FINAL_IMAGE_IMPORT,
              ImageImportAction.INIT_IMAGE_IMPORT_TOOL,
              ImageImportAction.SWITCH_TO_SELECT_TOOL,
            ],
          },
          ABSOLUTE_POINT_INPUT: {
            actions: [
              ImageImportAction.DRAW_FINAL_IMAGE_IMPORT,
              ImageImportAction.INIT_IMAGE_IMPORT_TOOL,
              ImageImportAction.SWITCH_TO_SELECT_TOOL,
            ],
          },
          RELATIVE_POINT_INPUT: {
            actions: [
              ImageImportAction.DRAW_FINAL_IMAGE_IMPORT,
              ImageImportAction.INIT_IMAGE_IMPORT_TOOL,
              ImageImportAction.SWITCH_TO_SELECT_TOOL,
            ],
          },
          ESC: {
            actions: ImageImportAction.SWITCH_TO_SELECT_TOOL,
          },
        },
      },
    },
  },
  {
    actions: {
      [ImageImportAction.INIT_IMAGE_IMPORT_TOOL]: assign(() => {
        setShouldDrawHelpers(true);
        setGhostHelperEntities([]);
        setSelectedEntityIds([]);
        setAngleGuideOriginPoint(null);
        return {
          startPoint: null,
          imageElement: null,
        };
      }),
      [ImageImportAction.STORE_IMAGE_DATA]: assign(({ event }) => {
        return {
          imageElement: (event as FileSelectedEvent).image,
        };
      }),
      [ImageImportAction.RECORD_START_POINT]: assign(({ context, event }) => {
        const startPoint = getPointFromEvent(null, event as PointInputEvent);
        setAngleGuideOriginPoint(startPoint);
        return {
          ...context,
          startPoint: startPoint,
        };
      }),
      [ImageImportAction.DRAW_TEMP_IMAGE_IMPORT]: ({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[IMAGE_IMPORT] startPoint is not set when calling DRAW_TEMP_IMAGE_IMPORT',
          );
        }
        if (!context.imageElement) {
          throw new Error(
            '[IMAGE_IMPORT] imageElement is not set when calling DRAW_TEMP_IMAGE_IMPORT',
          );
        }
        if (
          isPointEqual(
            context.startPoint,
            (event as DrawEvent).drawController.getWorldMouseLocation(),
          )
        ) {
          return; // Can't draw an image that is 0 pixels wide
        }
        const endPoint = getPointFromEvent(
          context.startPoint,
          event as PointInputEvent,
        );
        const containRectangle = getContainRectangleInsideRectangle(
          context.imageElement.naturalWidth,
          context.imageElement.naturalHeight,
          context.startPoint,
          endPoint,
        );
        if (!containRectangle) {
          return;
        }
        const activeImage = new ImageEntity(
          context.imageElement,
          containRectangle.low,
          containRectangle.high,
          0,
        );
        const draggedRectangle = new RectangleEntity(
          twoPointBoxToPolygon(context.startPoint, endPoint),
        );
        setGhostHelperEntities([activeImage]);
        setAngleGuideEntities([draggedRectangle]);
      },
      [ImageImportAction.DRAW_FINAL_IMAGE_IMPORT]: ({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[IMAGE_IMPORT] startPoint is not set when calling DRAW_TEMP_IMAGE_IMPORT',
          );
        }
        if (!context.imageElement) {
          throw new Error(
            '[IMAGE_IMPORT] imageArrayBuffer is not set when calling DRAW_TEMP_IMAGE_IMPORT',
          );
        }

        const containRectangle = getContainRectangleInsideRectangle(
          context.imageElement.naturalWidth,
          context.imageElement.naturalHeight,
          context.startPoint,
          (event as MouseClickEvent).worldMouseLocation,
        );

        if (!containRectangle) {
          return;
        }

        const activeImage = new ImageEntity(
          context.imageElement,
          boxToPolygon(containRectangle),
        );
        addEntities([activeImage], true);
      },
      [ImageImportAction.SWITCH_TO_SELECT_TOOL]: () => {
        setActiveToolActor(new Actor(selectToolStateMachine));
      },
    },
  },
);
