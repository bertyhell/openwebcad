import { Point } from '@flatten-js/core';
import {
  addEntity,
  setActiveEntity,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import { assign, createMachine } from 'xstate';
import {
  ActorEvent,
  DrawEvent,
  FileSelectedEvent,
  MouseClickEvent,
  StateEvent,
  ToolContext,
} from './tool.types.ts';
import { ImageEntity } from '../entities/ImageEntity.ts';

export interface ImageImportContext extends ToolContext {
  startPoint: Point | null;
  imageArrayBuffer: ArrayBuffer | null;
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
      imageArrayBuffer: null,
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
            target: ImageImportState.INIT,
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
            actions: ImageImportAction.DRAW_FINAL_IMAGE_IMPORT,
            target: ImageImportState.WAITING_FOR_END_POINT,
          },
          ESC: {
            target: ImageImportState.INIT,
          },
        },
      },
    },
  },
  {
    actions: {
      [ImageImportAction.INIT_IMAGE_IMPORT_TOOL]: assign(() => {
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
        return {
          startPoint: null,
        };
      }),
      [ImageImportAction.STORE_IMAGE_DATA]: assign(({ event }) => {
        return {
          imageArrayBuffer: (event as FileSelectedEvent).arrayBuffer,
        };
      }),
      [ImageImportAction.RECORD_START_POINT]: assign({
        startPoint: ({ event }) => {
          return (event as MouseClickEvent).worldClickPoint;
        },
      }),
      [ImageImportAction.DRAW_TEMP_IMAGE_IMPORT]: ({ context, event }) => {
        if (!context.startPoint) {
          throw new Error(
            '[IMAGE_IMPORT] startPoint is not set when calling DRAW_TEMP_IMAGE_IMPORT',
          );
        }
        if (!context.imageArrayBuffer) {
          throw new Error(
            '[IMAGE_IMPORT] imageArrayBuffer is not set when calling DRAW_TEMP_IMAGE_IMPORT',
          );
        }
        const activeImage = new ImageEntity(
          context.imageArrayBuffer,
          context.startPoint,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        setActiveEntity(activeImage);
      },
      [ImageImportAction.DRAW_FINAL_IMAGE_IMPORT]: assign(
        ({ context, event }) => {
          console.log('drawFinalImageImport', { context, event });

          if (!context.startPoint) {
            throw new Error(
              '[IMAGE_IMPORT] startPoint is not set when calling DRAW_TEMP_IMAGE_IMPORT',
            );
          }
          if (!context.imageArrayBuffer) {
            throw new Error(
              '[IMAGE_IMPORT] imageArrayBuffer is not set when calling DRAW_TEMP_IMAGE_IMPORT',
            );
          }

          const endPoint = (event as MouseClickEvent).worldClickPoint;
          const activeImage = new ImageEntity(
            context.imageArrayBuffer,
            context.startPoint,
            endPoint,
          );
          addEntity(activeImage);

          return {
            startPoint: null,
            imageArrayBuffer: null,
          };
        },
      ),
    },
  },
);
