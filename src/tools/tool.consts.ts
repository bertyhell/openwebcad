/* eslint-disable @typescript-eslint/no-explicit-any */
import {Tool} from '../tools';
import {StateMachine} from 'xstate';
import {lineToolStateMachine} from './line-tool';
import {rectangleToolStateMachine} from './rectangle-tool';
import {circleToolStateMachine} from './circle-tool';
import {selectToolStateMachine} from './select-tool';
import {eraserToolStateMachine} from './eraser-tool';
import {moveToolStateMachine} from './move-tool';
import {imageImportToolStateMachine} from './image-import-tool';
import {scaleToolStateMachine} from './scale-tool';
import {rotateToolStateMachine} from './rotate-tool';
import {measurementToolStateMachine} from './measurement-tool';
import {alignLeftToolStateMachine} from "./align-left-tool.ts";
import {alignCenterHorizontalToolStateMachine} from "./align-center-horizontal-tool.ts";
import {alignRightToolStateMachine} from "./align-right-tool.ts";
import {alignTopToolStateMachine} from "./align-top-tool.ts";
import {alignCenterVerticalToolStateMachine} from "./align-middle-vertical-tool.ts";
import {alignBottomToolStateMachine} from "./align-bottom-tool.ts";

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
  [Tool.ALIGN_LEFT]: alignLeftToolStateMachine,
  [Tool.ALIGN_CENTER_HORIZONTAL]: alignCenterHorizontalToolStateMachine,
  [Tool.ALIGN_RIGHT]: alignRightToolStateMachine,
  [Tool.ALIGN_TOP]: alignTopToolStateMachine,
  [Tool.ALIGN_CENTER_VERTICAL]: alignCenterVerticalToolStateMachine,
  [Tool.ALIGN_BOTTOM]: alignBottomToolStateMachine,
};
