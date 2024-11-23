/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tool } from '../tools';
import { StateMachine } from 'xstate';
import { lineToolStateMachine } from './line-tool';
import { rectangleToolStateMachine } from './rectangle-tool';
import { circleToolStateMachine } from './circle-tool';
import { selectToolStateMachine } from './select-tool';
import { eraserToolStateMachine } from './eraser-tool';
import { moveToolStateMachine } from './move-tool';
import { imageImportToolStateMachine } from './image-import-tool';
import { scaleToolStateMachine } from './scale-tool';
import { rotateToolStateMachine } from './rotate-tool';
import { measurementToolStateMachine } from './measurement-tool';

export const TOOL_STATE_MACHINES: Record<
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
  [Tool.SCALE]: scaleToolStateMachine,
  [Tool.ROTATE]: rotateToolStateMachine,
  [Tool.IMAGE_IMPORT]: imageImportToolStateMachine,
  [Tool.MEASUREMENT]: measurementToolStateMachine,
};
