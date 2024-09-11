import { Point } from '@flatten-js/core';
import { LineEntity } from '../entities/LineEntity.ts';
import {
  addEntity,
  getActiveLineColor,
  getActiveLineWidth,
  setActiveEntity,
  setActiveTool,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';
import { DrawEvent, KeyboardEscEvent, MouseClickEvent } from './tool.types.ts';

export interface LineContext {
  startPoint: Point | null;
}

const lineToolStateMachine = createMachine(
  {
    types: {} as {
      context: LineContext;
      events: MouseClickEvent | KeyboardEscEvent | DrawEvent;
    },
    context: {
      startPoint: null,
    },
    initial: 'waitingForStartPoint',
    states: {
      waitingForStartPoint: {
        always: {
          actions: 'initLineTool',
        },
        on: {
          MOUSE_CLICK: {
            actions: 'recordStartPoint',
            target: 'waitingForEndPoint',
          },
        },
      },
      waitingForEndPoint: {
        on: {
          DRAW: {
            actions: 'drawTempLine',
          },
          MOUSE_CLICK: {
            actions: 'drawFinalLine',
            target: 'waitingForEndPoint',
          },
          ESC: {
            actions: 'resetActiveEntity',
            target: 'waitingForStartPoint',
          },
        },
      },
    },
  },
  {
    actions: {
      initLineTool: () => {
        console.log('activate line tool');
        setActiveTool(Tool.Line);
        setShouldDrawHelpers(true);
        setActiveEntity(null);
        setSelectedEntityIds([]);
      },
      recordStartPoint: assign({
        startPoint: ({ event }) => {
          return (event as MouseClickEvent).worldClickPoint;
        },
      }),
      drawTempLine: ({ context, event }) => {
        console.log('drawTempLine', { context, event });

        const activeLine = new LineEntity(
          context.startPoint as Point,
          (event as DrawEvent).drawInfo.worldMouseLocation,
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        setActiveEntity(activeLine);
      },
      drawFinalLine: assign(({ context, event }) => {
        console.log('drawFinalLine', { context, event });
        const endPoint = (event as MouseClickEvent).worldClickPoint;
        const activeLine = new LineEntity(
          context.startPoint as Point,
          endPoint,
        );
        activeLine.lineColor = getActiveLineColor();
        activeLine.lineWidth = getActiveLineWidth();
        addEntity(activeLine);

        // Keep drawing from the last point
        setActiveEntity(new LineEntity(endPoint));
        return {
          startPoint: endPoint,
        };
      }),
      resetActiveEntity: assign(() => {
        setActiveEntity(null);
        return {
          startPoint: null,
        };
      }),
    },
  },
);

export const lineToolActor = createActor(lineToolStateMachine);
lineToolActor.subscribe(state => {
  console.log('line tool state:', state.value);
});
lineToolActor.start();
