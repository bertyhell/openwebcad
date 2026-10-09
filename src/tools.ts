export enum Tool {
	SELECT = 'SELECT',
	LINE = 'LINE',
	RECTANGLE = 'RECTANGLE',
	CIRCLE = 'CIRCLE',
	MOVE = 'MOVE',
	COPY = 'COPY',
	SCALE = 'SCALE',
	ERASER = 'ERASER',
	IMAGE_IMPORT = 'IMAGE_IMPORT',
	ROTATE = 'ROTATE',
	MEASUREMENT = 'MEASUREMENT',
	ALIGN_LEFT = 'ALIGN_LEFT',
	ALIGN_RIGHT = 'ALIGN_RIGHT',
	ALIGN_CENTER_HORIZONTAL = 'ALIGN_CENTER_HORIZONTAL',
	ALIGN_TOP = 'ALIGN_TOP',
	ALIGN_BOTTOM = 'ALIGN_BOTTOM',
	ALIGN_CENTER_VERTICAL = 'ALIGN_CENTER_VERTICAL',
	ARRAY = 'ARRAY',
	PEDIT = 'PEDIT',
	FILL = 'FILL',
	ZOOM = 'ZOOM',
}

/**
 * Single letter command aliases: type the letter and press ENTER to activate the tool
 */
export const TOOL_SHORTCUTS: Partial<Record<Tool, string>> = {
	[Tool.SELECT]: 'S',
	[Tool.LINE]: 'L',
	[Tool.RECTANGLE]: 'R',
	[Tool.CIRCLE]: 'C',
	[Tool.MOVE]: 'M',
	[Tool.COPY]: 'D',
	[Tool.SCALE]: 'Q',
	[Tool.ROTATE]: 'O',
	[Tool.ARRAY]: 'Y',
	[Tool.PEDIT]: 'J',
	[Tool.MEASUREMENT]: 'N',
	[Tool.FILL]: 'B',
	[Tool.ERASER]: 'E',
	[Tool.ZOOM]: 'Z',
};
