import type { StateMachine } from 'xstate'; /* eslint-disable @typescript-eslint/no-explicit-any */
import { Tool } from '../tools';
import {
	alignBottomToolStateMachine,
	alignCenterHorizontalToolStateMachine,
	alignCenterVerticalToolStateMachine,
	alignLeftToolStateMachine,
	alignRightToolStateMachine,
	alignTopToolStateMachine,
} from './align-tools.ts';
import { arcToolStateMachine } from './arc-tool.ts';
import { arrayToolStateMachine } from './array-tool.ts';
import { circleToolStateMachine } from './circle-tool';
import { copyToolStateMachine } from './copy-tool.ts';
import { chamferToolStateMachine, filletToolStateMachine } from './corner-tools.ts';
import { eraserToolStateMachine } from './eraser-tool';
import { extendToolStateMachine } from './extend-tool.ts';
import { fillToolStateMachine } from './fill-tool.ts';
import { imageImportToolStateMachine } from './image-import-tool';
import { lineToolStateMachine } from './line-tool';
import { measurementToolStateMachine } from './measurement-tool';
import { mirrorToolStateMachine } from './mirror-tool.ts';
import { moveToolStateMachine } from './move-tool';
import { offsetToolStateMachine } from './offset-tool.ts';
import { peditToolStateMachine } from './pedit-tool.ts';
import { polyLineToolStateMachine } from './polyline-tool.ts';
import { rectangleToolStateMachine } from './rectangle-tool';
import { rotateToolStateMachine } from './rotate-tool';
import { scaleToolStateMachine } from './scale-tool';
import { selectToolStateMachine } from './select-tool';
import { textToolStateMachine } from './text-tool.ts';
import { zoomToolStateMachine } from './zoom-tool.ts';

export const TOOL_STATE_MACHINES: Record<
	Partial<Tool>,
	StateMachine<
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
		any,
		// biome-ignore lint/suspicious/noExplicitAny: every tool has its own state machine types
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
	[Tool.ARRAY]: arrayToolStateMachine,
	[Tool.PEDIT]: peditToolStateMachine,
	[Tool.FILL]: fillToolStateMachine,
	[Tool.ZOOM]: zoomToolStateMachine,
	[Tool.MIRROR]: mirrorToolStateMachine,
	[Tool.OFFSET]: offsetToolStateMachine,
	[Tool.FILLET]: filletToolStateMachine,
	[Tool.CHAMFER]: chamferToolStateMachine,
	[Tool.EXTEND]: extendToolStateMachine,
	[Tool.ARC]: arcToolStateMachine,
	[Tool.POLYLINE]: polyLineToolStateMachine,
	[Tool.TEXT]: textToolStateMachine,
};
