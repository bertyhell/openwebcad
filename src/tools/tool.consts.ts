import type {StateMachine} from 'xstate'; /* eslint-disable @typescript-eslint/no-explicit-any */
import {Tool} from '../tools';
import {alignBottomToolStateMachine} from "./align-bottom-tool.ts";
import {alignCenterHorizontalToolStateMachine} from "./align-center-horizontal-tool.ts";
import {alignLeftToolStateMachine} from "./align-left-tool.ts";
import {alignCenterVerticalToolStateMachine} from "./align-middle-vertical-tool.ts";
import {alignRightToolStateMachine} from "./align-right-tool.ts";
import {alignTopToolStateMachine} from "./align-top-tool.ts";
import {circleToolStateMachine} from './circle-tool';
import {copyToolStateMachine} from "./copy-tool.ts";
import {eraserToolStateMachine} from './eraser-tool';
import {imageImportToolStateMachine} from './image-import-tool';
import {lineToolStateMachine} from './line-tool';
import {measurementToolStateMachine} from './measurement-tool';
import {moveToolStateMachine} from './move-tool';
import {rectangleToolStateMachine} from './rectangle-tool';
import {rotateToolStateMachine} from './rotate-tool';
import {scaleToolStateMachine} from './scale-tool';
import {selectToolStateMachine} from './select-tool';

export const TOOL_STATE_MACHINES: Record<
	Partial<Tool>,
	StateMachine<
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		any
	>
> = {
	[Tool.LINE]: lineToolStateMachine,
	[Tool.RECTANGLE]: rectangleToolStateMachine,
	[Tool.CIRCLE]: circleToolStateMachine,
	[Tool.SELECT]: selectToolStateMachine,
	[Tool.ERASER]: eraserToolStateMachine,
	[Tool.MOVE]: moveToolStateMachine,
	[Tool.COPY]: copyToolStateMachine,
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
