import { TOOL_SHORTCUTS, Tool } from '../../tools.ts';

export enum ToolGroupId {
	DRAW = 'draw',
	MODIFY = 'modify',
	ANNOTATE = 'annotate',
}

export interface ToolGroup {
	id: ToolGroupId;
	name: string;
	color: string;
}

export interface ToolDefinition {
	tool: Tool;
	group: ToolGroupId;
	label: string;
	hint: string;
	/**
	 * Svg path in a 24x24 viewBox
	 */
	iconPath: string;
	dataId: string;
	/**
	 * Single letter command alias, type it and press ENTER
	 */
	shortcut?: string;
	/**
	 * Neutral tools do not use the color of their group
	 */
	neutral?: boolean;
	/**
	 * Tool needs a file before it can start. eg: image import
	 */
	fileAccept?: string;
}

export const NEUTRAL_TOOL_COLOR = 'var(--color-hw-stone-100)';
export const ALIGN_COLOR = 'var(--color-hw-align)';

export const TOOL_GROUPS: ToolGroup[] = [
	{ id: ToolGroupId.DRAW, name: 'Draw', color: 'var(--color-hw-draw)' },
	{ id: ToolGroupId.MODIFY, name: 'Modify', color: 'var(--color-hw-modify)' },
	{ id: ToolGroupId.ANNOTATE, name: 'Annotate', color: 'var(--color-hw-annotate)' },
];

export const TOOLS: ToolDefinition[] = [
	{
		tool: Tool.SELECT,
		group: ToolGroupId.DRAW,
		label: 'Select',
		hint: 'Select entities by clicking or dragging a box',
		iconPath: 'M5 4l5 15 2.5-6.5L19 10z',
		dataId: 'select-button',
		neutral: true,
	},
	{
		tool: Tool.LINE,
		group: ToolGroupId.DRAW,
		label: 'Line',
		hint: 'Draw straight line segments',
		iconPath: 'M6 18L18 6M3 21v-4h4v4zM17 7V3h4v4z',
		dataId: 'line-button',
	},
	{
		tool: Tool.RECTANGLE,
		group: ToolGroupId.DRAW,
		label: 'Rectangle',
		hint: 'Draw a rectangle from two corners',
		iconPath: 'M4 6h16v12H4z',
		dataId: 'rectangle-button',
	},
	{
		tool: Tool.CIRCLE,
		group: ToolGroupId.DRAW,
		label: 'Circle',
		hint: 'Draw a circle from a centre and a radius',
		iconPath: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z',
		dataId: 'circle-button',
	},
	{
		tool: Tool.IMAGE_IMPORT,
		group: ToolGroupId.DRAW,
		label: 'Image',
		hint: 'Place a JPG or PNG image',
		iconPath: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 8h1v1h-1z',
		dataId: 'import-image-button',
		fileAccept: '.jpg,.jpeg,.png',
	},
	{
		tool: Tool.MOVE,
		group: ToolGroupId.MODIFY,
		label: 'Move',
		hint: 'Move the selection from a base point to a target point',
		iconPath: 'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
		dataId: 'move-button',
	},
	{
		tool: Tool.COPY,
		group: ToolGroupId.MODIFY,
		label: 'Copy',
		hint: 'Like Move, but keeps the original in place',
		iconPath: 'M8 8h12v12H8zM16 8V4H4v12h4',
		dataId: 'copy-button',
	},
	{
		tool: Tool.SCALE,
		group: ToolGroupId.MODIFY,
		label: 'Scale',
		hint: 'Scale the selection around a base point',
		iconPath: 'M4 10h10v10H4zM13 11l7-7M14 4h6v6',
		dataId: 'scale-button',
	},
	{
		tool: Tool.ROTATE,
		group: ToolGroupId.MODIFY,
		label: 'Rotate',
		hint: 'Rotate the selection around a centre point',
		iconPath: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5',
		dataId: 'rotate-button',
	},
	{
		tool: Tool.ARRAY,
		group: ToolGroupId.MODIFY,
		label: 'Array copy',
		hint: 'Repeat the selection in a linear or radial pattern',
		iconPath: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
		dataId: 'array-button',
	},
	{
		tool: Tool.PEDIT,
		group: ToolGroupId.MODIFY,
		label: 'Join',
		hint: 'Join lines and arcs into one polyline',
		iconPath: 'M3 19l6-6M15 11l6-6M10.5 10.5h3v3h-3z',
		dataId: 'pedit-button',
	},
	{
		tool: Tool.MEASUREMENT,
		group: ToolGroupId.ANNOTATE,
		label: 'Measure',
		hint: 'Add a dimension between two points',
		iconPath: 'M4 7v10M20 7v10M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3',
		dataId: 'measurement-button',
	},
	{
		tool: Tool.FILL,
		group: ToolGroupId.ANNOTATE,
		label: 'Fill',
		hint: 'Fill an enclosed area with the fill colour',
		iconPath:
			'M4 11l7-7 8 8-7 7zM4 11h15M20 15.5c.8 1.3 1.5 2.2 1.5 3a1.5 1.5 0 0 1-3 0c0-.8.7-1.7 1.5-3z',
		dataId: 'fill-button',
	},
	{
		tool: Tool.ERASER,
		group: ToolGroupId.ANNOTATE,
		label: 'Trim',
		hint: 'Erase parts of an entity between intersections',
		iconPath: 'M6 2v16h16M2 6h16v16',
		dataId: 'delete-segment-button',
	},
].map((toolDefinition) => ({
	...toolDefinition,
	shortcut: TOOL_SHORTCUTS[toolDefinition.tool],
}));

export interface AlignDefinition {
	tool: Tool;
	label: string;
	iconPath: string;
	dataId: string;
}

export const ALIGN_TOOLS: AlignDefinition[] = [
	{
		tool: Tool.ALIGN_LEFT,
		label: 'Left',
		iconPath: 'M4 3v18M8 7h10v4H8zM8 13h6v4H8z',
		dataId: 'align-left-button',
	},
	{
		tool: Tool.ALIGN_CENTER_HORIZONTAL,
		label: 'Center',
		iconPath: 'M12 3v18M6 7h12v4H6zM8 13h8v4H8z',
		dataId: 'align-center-horizontal-button',
	},
	{
		tool: Tool.ALIGN_RIGHT,
		label: 'Right',
		iconPath: 'M20 3v18M6 7h10v4H6zM10 13h6v4h-6z',
		dataId: 'align-right-button',
	},
	{
		tool: Tool.ALIGN_TOP,
		label: 'Top',
		iconPath: 'M3 4h18M7 8h4v10H7zM13 8h4v6h-4z',
		dataId: 'align-top-button',
	},
	{
		tool: Tool.ALIGN_CENTER_VERTICAL,
		label: 'Middle',
		iconPath: 'M3 12h18M7 6h4v12H7zM13 8h4v8h-4z',
		dataId: 'align-center-vertical-button',
	},
	{
		tool: Tool.ALIGN_BOTTOM,
		label: 'Bottom',
		iconPath: 'M3 20h18M7 6h4v10H7zM13 10h4v6h-4z',
		dataId: 'align-bottom-button',
	},
];

export const ICON_PATHS = {
	file: 'M6 3h8l4 4v14H6zM14 3v4h4',
	chevronDown: 'M6 9l6 6 6-6',
	undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
	redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
	collapse: 'M4 4h16v16H4zM9 4v16M16 9l-3 3 3 3',
	expand: 'M4 4h16v16H4zM9 4v16M13 9l3 3-3 3',
	align: 'M12 3v18M6 7h12v4H6zM8 13h8v4H8z',
	layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
	save: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
	newFile: 'M6 3h8l4 4v14H6zM12 11v6M9 14h6',
	code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
	eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z',
	eyeOff:
		'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a10 10 0 0 0 5.4-1.6',
	lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
	unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2',
	selectAll: 'M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M9 9h6v6H9z',
	moveToLayer: 'M12 4v11M7 10l5 5 5-5M4 20h16',
	trash: 'M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13',
	plus: 'M12 5v14M5 12h14',
};

export const LINE_WIDTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const ANGLE_STEPS = [5, 15, 30, 45, 90];
export const ZOOM_LEVELS = [20, 50, 75, 100, 150, 200, 400];

export const GITHUB_URL = 'https://github.com/bertyhell/openwebcad';
