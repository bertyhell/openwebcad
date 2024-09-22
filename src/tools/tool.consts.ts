/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tool } from '../tools.ts';
import { StateMachine } from 'xstate';
import { lineToolStateMachine } from './line-tool.ts';
import { rectangleToolStateMachine } from './rectangle-tool.ts';
import { circleToolStateMachine } from './circle-tool.ts';
import { selectToolStateMachine } from './select-tool.ts';
import { eraserToolStateMachine } from './eraser-tool.ts';
import { moveToolStateMachine } from './move-tool.ts';
import { imageImportToolStateMachine } from './image-import-tool.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toolStateMachines: Record<
  Partial<Tool>,
  StateMachine<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
> = {
  [Tool.LINE]: lineToolStateMachine,
  [Tool.RECTANGLE]: rectangleToolStateMachine,
  [Tool.CIRCLE]: circleToolStateMachine,
  [Tool.SELECT]: selectToolStateMachine,
  [Tool.ERASER]: eraserToolStateMachine,
  [Tool.MOVE]: moveToolStateMachine,
  [Tool.IMAGE_IMPORT]: imageImportToolStateMachine,
};
