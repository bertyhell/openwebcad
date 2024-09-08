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
import { ToolHandler } from './tool.types.ts';
import { Tool } from '../tools.ts';
import { assign, createActor, createMachine } from 'xstate';
import { DrawInfo } from '../App.types.ts';

interface LineContext {
  startPoint: Point | null;
}

interface MouseClickEvent {
  type: 'MOUSE_CLICK';
  worldClickPoint: Point;
}

interface KeyboardEscEvent {
  type: 'ESC';
}

interface DrawEvent {
  type: 'DRAW';
  drawInfo: DrawInfo;
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
          actions: 'enableHelpers',
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
      enableHelpers: () => {
        setShouldDrawHelpers(true);
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

export const lineToolHandler: ToolHandler = {
  handleToolActivate: () => {
    console.log('activate line tool');
    setActiveTool(Tool.Line);
    setShouldDrawHelpers(true);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (worldClickPoint: Point) => {
    // console.log('line tool click:', worldClickPoint);
    // const entities = getEntities();
    // const activeEntity = getActiveEntity();
    //
    // let activeLine = activeEntity as LineEntity | null;
    // if (!activeLine) {
    //   // Start a new line
    //   activeLine = new LineEntity();
    //   activeLine.lineColor = getActiveLineColor();
    //   activeLine.lineWidth = getActiveLineWidth();
    //   setActiveEntity(activeLine);
    // }
    // const completed = activeLine.send(worldClickPoint);
    //
    // if (completed) {
    //   // Finish the line
    //   setEntities([...entities, activeLine]);
    //
    //   // Start a new line from the endpoint of the last line
    //   activeLine = new LineEntity();
    //   activeLine.lineColor = getActiveLineColor();
    //   activeLine.lineWidth = getActiveLineWidth();
    //   setActiveEntity(activeLine);
    //   activeLine.send(worldClickPoint);
    // }
  },

  handleToolTypedCommand: (command: string) => {
    console.log('erase tool typed command:', command);
  },
};
