/**
 * Width of the expanded sidebar containing all the tools on the left side of the screen
 * Also used as the canvas offset when there is no canvas element (eg: during unit tests)
 */
export const TOOLBAR_WIDTH = 304;

/**
 * Width of the sidebar when it is collapsed to a narrow icon rail
 */
export const TOOLBAR_WIDTH_COLLAPSED = 56;

/**
 * Very small number that will be used to compare floating point numbers on equality
 * since javascript isn't always very accurate with floating point numbers
 */
export const EPSILON = 1e-6;

/**
 * Margin around the SVG elements when exporting to a .svg image
 */
export let SVG_MARGIN = 10;

/**
 * Margin around the PDF elements when exporting to a .pdf document
 */
export let PDF_MARGIN = 10;

/**
 * The width and height of the cross that will be drawn instead of the cursor when hovering the drawing canvas
 */
export let CURSOR_SIZE = 30;

/**
 * The background color of the canvas
 */
export let CANVAS_BACKGROUND_COLOR = '#181715';

/**
 * The foreground color of the canvas
 * This will be the color of the lines you draw
 */
export let CANVAS_FOREGROUND_COLOR = '#fff';

/**
 * The color of the angle guide lines that are drawn when you are close to an angle step from the last drawn point
 */
export let ANGLE_GUIDES_COLOR = '#999999';

/**
 * The style of the line dash of the angle guide lines that are drawn when you are close to an angle step from the last drawn point
 */
export let ANGLE_GUIDES_DASH = [5, 5];

/**
 * The color of the snap points that are drawn when you are close to a snap point
 * These are the shapes you see when you get near an line endpoint or a circle center point, ...
 */
export let SNAP_POINT_COLOR = '#FFFF00';

/**
 * How far a snap point can be from the mouse to still be considered a close snap point
 */
export let SNAP_POINT_DISTANCE = 15;

/**
 * How far the mouse can be from an angle guide line to show the "near angle step" snap point
 */
export let SNAP_ANGLE_DISTANCE = 15;

/**
 * How far the mouse can be from an entity to highlight it and subsequently select it when you click
 */
export let HIGHLIGHT_ENTITY_DISTANCE = 15;

/**
 * The size of the snap point indicator shapes that are shown on active snap points
 */
export let SNAP_POINT_SIZE = 15;

/**
 * How long you need to hover over a snap point to make it a marked snap point that will show angle guides
 * in milliseconds
 */
export let HOVERED_SNAP_POINT_TIME = 1000;

/**
 * Maximum number of snap points that can be marked at the same time
 * Marked snap points also get angle guides
 */
export let MAX_MARKED_SNAP_POINTS = 3;

/**
 * Length of the extensions that extend past the measurement arrows of a measurement
 */
export let MEASUREMENT_EXTENSION_LENGTH = 20;

/**
 * Distance that measurement lines stay away from the point of origin of the measurement
 */
export let MEASUREMENT_ORIGIN_MARGIN = 20;

/**
 * Distance the measurement is drawn while drawing the start and endpoints of the measurements but before the user decides the offset point
 */
export let MEASUREMENT_DEFAULT_OFFSET = 200;

/**
 * Length of the arrow heads for measurements
 */
export let ARROW_HEAD_LENGTH = 20;

/**
 * Width of the arrow heads for measurements
 */
export let ARROW_HEAD_WIDTH = 7;

/**
 * Number of decimals to show on measurements. eg: 2 would give a measurement of: 503.32
 */
export let MEASUREMENT_DECIMAL_PLACES = 2;

/**
 * Distance between the measurement line and the label of the measurement
 */
export let MEASUREMENT_LABEL_OFFSET = 20;

/**
 * Size of the measurement labels containing the length of the measurements
 */
export let MEASUREMENT_FONT_SIZE = 40;

/**
 * Colors for the selection rectangle
 */
export let SELECTION_RECTANGLE_COLOR_INTERSECTION = '#b6ff9a';
export let SELECTION_RECTANGLE_COLOR_CONTAINS = '#6899f3';
export let SELECTION_RECTANGLE_WIDTH = 1;
export let SELECTION_RECTANGLE_STYLE = [5, 5]; // Dashed line

/**
 * Angle guides and move tool line styles
 */
export let GUIDE_LINE_COLOR = '#999';
export let GUIDE_LINE_WIDTH = 1;
export let GUIDE_LINE_STYLE = [5, 5]; // Dashed line

/**
 * Mouse zoom multiplier. Higher zooms faster for each mouse scroll
 */
export let MOUSE_ZOOM_MULTIPLIER = 0.1;

/**
 * Canvas input field offset to mouse location
 */
export let CANVAS_INPUT_FIELD_MOUSE_OFFSET = 20;

/**
 * Canvas input field width
 */
export let CANVAS_INPUT_FIELD_WIDTH = 150;

/**
 * Canvas input field height
 */
export let CANVAS_INPUT_FIELD_HEIGHT = 20;

/**
 * Canvas input field background color
 */
export let CANVAS_INPUT_FIELD_BACKGROUND_COLOR = '#161616';

/**
 * Canvas input field text color
 */
export let CANVAS_INPUT_FIELD_TEXT_COLOR = '#FFF';

/**
 * Canvas input field background color when text is selected
 */
export let CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR = '#1e90ff';

/**
 * Canvas input field text color when text is selected
 */
export let CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR = '#000';

/**
 * Canvas input field text size in pixels
 */
export let CANVAS_INPUT_FIELD_FONT_SIZE = 16;

/**
 * Canvas input field instruction text color
 */
export let CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR = '#999';

/**
 * Multiplier to determine the pdf line width from the in application line width
 * This seems to be needed since 1px line widths look quite fat in pdf
 */
export let PDF_LINE_WIDTH_FACTOR = 0.25;

/**
 * Number of parts to split a circle into to test for boundary loops around other shapes
 * lower number is faster
 * higher number is more accurate
 * minimum should be 4 (quadrants)
 */
export let ARC_SEGMENTS_FOR_LOOPS_CHECK = 36;

/**
 * Step to zoom in or out with the zoom tool
 */
export let ZOOM_STEP_MULTIPLIER = 1.2;

/**
 * Default margin in screen pixels to add around entities when zooming to bounds
 */
export let DEFAULT_ZOOM_MARGIN = 50;

export const COLOR_LIST = [
	'#ffffff',
	'#2f4f4f',
	'#800000',
	'#006400',
	'#d2b48c',
	'#ff0000',
	'#00ced1',
	'#ffa500',
	'#ffff00',
	'#00ff00',
	'#0000ff',
	'#ff00ff',
	'#1e90ff',
	'#dda0dd',
	'#ff1493',
	'#98fb98',
];

/**
 * Number to multiply degrees with to end up with the equivalent radians
 */
export const TO_RADIANS = Math.PI / 180;

/**
 * Number to multiply radians with to end up with the equivalent degrees
 */
export const TO_DEGREES = 180 / Math.PI;

/**
 * Milliseconds to wait after the last change before saving the drawing to local storage
 */
export let AUTOSAVE_DELAY = 1000;

/**
 * Opacity of entities that are drawn faded, eg: the originals while previewing a move
 */
export let DIMMED_ENTITY_ALPHA = 0.35;

/**
 * Colors of the background grid: the minor lines, every 5th (major) line and the x and y axis
 */
export let GRID_MINOR_LINE_COLOR = '#24221f';
export let GRID_MAJOR_LINE_COLOR = '#302d29';
export let GRID_AXIS_LINE_COLOR = '#45413b';

export type Theme = 'dark' | 'light';

/**
 * Color theme of the user interface and the drawing canvas
 */
export let THEME: Theme = 'dark';

export type SettingValue = string | number | number[];

export interface SettingDefinition {
	key: SettingKey;
	label: string;
	type: 'number' | 'color' | 'dash';
	/**
	 * Unit shown next to the input. "units" are drawing units, px are screen pixels
	 * Settings with unit % are stored as a fraction (0.35) and shown as a percentage (35)
	 */
	unit?: SettingUnit;
}

export type SettingUnit = 'units' | 'px' | 'ms' | '%' | '×';

const SETTERS = {
	SVG_MARGIN: (value: SettingValue) => {
		SVG_MARGIN = value as typeof SVG_MARGIN;
	},
	PDF_MARGIN: (value: SettingValue) => {
		PDF_MARGIN = value as typeof PDF_MARGIN;
	},
	CURSOR_SIZE: (value: SettingValue) => {
		CURSOR_SIZE = value as typeof CURSOR_SIZE;
	},
	CANVAS_BACKGROUND_COLOR: (value: SettingValue) => {
		CANVAS_BACKGROUND_COLOR = value as typeof CANVAS_BACKGROUND_COLOR;
	},
	CANVAS_FOREGROUND_COLOR: (value: SettingValue) => {
		CANVAS_FOREGROUND_COLOR = value as typeof CANVAS_FOREGROUND_COLOR;
	},
	ANGLE_GUIDES_COLOR: (value: SettingValue) => {
		ANGLE_GUIDES_COLOR = value as typeof ANGLE_GUIDES_COLOR;
	},
	ANGLE_GUIDES_DASH: (value: SettingValue) => {
		ANGLE_GUIDES_DASH = value as typeof ANGLE_GUIDES_DASH;
	},
	SNAP_POINT_COLOR: (value: SettingValue) => {
		SNAP_POINT_COLOR = value as typeof SNAP_POINT_COLOR;
	},
	SNAP_POINT_DISTANCE: (value: SettingValue) => {
		SNAP_POINT_DISTANCE = value as typeof SNAP_POINT_DISTANCE;
	},
	SNAP_ANGLE_DISTANCE: (value: SettingValue) => {
		SNAP_ANGLE_DISTANCE = value as typeof SNAP_ANGLE_DISTANCE;
	},
	HIGHLIGHT_ENTITY_DISTANCE: (value: SettingValue) => {
		HIGHLIGHT_ENTITY_DISTANCE = value as typeof HIGHLIGHT_ENTITY_DISTANCE;
	},
	SNAP_POINT_SIZE: (value: SettingValue) => {
		SNAP_POINT_SIZE = value as typeof SNAP_POINT_SIZE;
	},
	HOVERED_SNAP_POINT_TIME: (value: SettingValue) => {
		HOVERED_SNAP_POINT_TIME = value as typeof HOVERED_SNAP_POINT_TIME;
	},
	MAX_MARKED_SNAP_POINTS: (value: SettingValue) => {
		MAX_MARKED_SNAP_POINTS = value as typeof MAX_MARKED_SNAP_POINTS;
	},
	MEASUREMENT_EXTENSION_LENGTH: (value: SettingValue) => {
		MEASUREMENT_EXTENSION_LENGTH = value as typeof MEASUREMENT_EXTENSION_LENGTH;
	},
	MEASUREMENT_ORIGIN_MARGIN: (value: SettingValue) => {
		MEASUREMENT_ORIGIN_MARGIN = value as typeof MEASUREMENT_ORIGIN_MARGIN;
	},
	MEASUREMENT_DEFAULT_OFFSET: (value: SettingValue) => {
		MEASUREMENT_DEFAULT_OFFSET = value as typeof MEASUREMENT_DEFAULT_OFFSET;
	},
	ARROW_HEAD_LENGTH: (value: SettingValue) => {
		ARROW_HEAD_LENGTH = value as typeof ARROW_HEAD_LENGTH;
	},
	ARROW_HEAD_WIDTH: (value: SettingValue) => {
		ARROW_HEAD_WIDTH = value as typeof ARROW_HEAD_WIDTH;
	},
	MEASUREMENT_DECIMAL_PLACES: (value: SettingValue) => {
		MEASUREMENT_DECIMAL_PLACES = value as typeof MEASUREMENT_DECIMAL_PLACES;
	},
	MEASUREMENT_LABEL_OFFSET: (value: SettingValue) => {
		MEASUREMENT_LABEL_OFFSET = value as typeof MEASUREMENT_LABEL_OFFSET;
	},
	MEASUREMENT_FONT_SIZE: (value: SettingValue) => {
		MEASUREMENT_FONT_SIZE = value as typeof MEASUREMENT_FONT_SIZE;
	},
	SELECTION_RECTANGLE_COLOR_INTERSECTION: (value: SettingValue) => {
		SELECTION_RECTANGLE_COLOR_INTERSECTION = value as typeof SELECTION_RECTANGLE_COLOR_INTERSECTION;
	},
	SELECTION_RECTANGLE_COLOR_CONTAINS: (value: SettingValue) => {
		SELECTION_RECTANGLE_COLOR_CONTAINS = value as typeof SELECTION_RECTANGLE_COLOR_CONTAINS;
	},
	SELECTION_RECTANGLE_WIDTH: (value: SettingValue) => {
		SELECTION_RECTANGLE_WIDTH = value as typeof SELECTION_RECTANGLE_WIDTH;
	},
	SELECTION_RECTANGLE_STYLE: (value: SettingValue) => {
		SELECTION_RECTANGLE_STYLE = value as typeof SELECTION_RECTANGLE_STYLE;
	},
	GUIDE_LINE_COLOR: (value: SettingValue) => {
		GUIDE_LINE_COLOR = value as typeof GUIDE_LINE_COLOR;
	},
	GUIDE_LINE_WIDTH: (value: SettingValue) => {
		GUIDE_LINE_WIDTH = value as typeof GUIDE_LINE_WIDTH;
	},
	GUIDE_LINE_STYLE: (value: SettingValue) => {
		GUIDE_LINE_STYLE = value as typeof GUIDE_LINE_STYLE;
	},
	MOUSE_ZOOM_MULTIPLIER: (value: SettingValue) => {
		MOUSE_ZOOM_MULTIPLIER = value as typeof MOUSE_ZOOM_MULTIPLIER;
	},
	CANVAS_INPUT_FIELD_MOUSE_OFFSET: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_MOUSE_OFFSET = value as typeof CANVAS_INPUT_FIELD_MOUSE_OFFSET;
	},
	CANVAS_INPUT_FIELD_WIDTH: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_WIDTH = value as typeof CANVAS_INPUT_FIELD_WIDTH;
	},
	CANVAS_INPUT_FIELD_HEIGHT: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_HEIGHT = value as typeof CANVAS_INPUT_FIELD_HEIGHT;
	},
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_BACKGROUND_COLOR = value as typeof CANVAS_INPUT_FIELD_BACKGROUND_COLOR;
	},
	CANVAS_INPUT_FIELD_TEXT_COLOR: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_TEXT_COLOR = value as typeof CANVAS_INPUT_FIELD_TEXT_COLOR;
	},
	CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR =
			value as typeof CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR;
	},
	CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR =
			value as typeof CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR;
	},
	CANVAS_INPUT_FIELD_FONT_SIZE: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_FONT_SIZE = value as typeof CANVAS_INPUT_FIELD_FONT_SIZE;
	},
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR: (value: SettingValue) => {
		CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR =
			value as typeof CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR;
	},
	PDF_LINE_WIDTH_FACTOR: (value: SettingValue) => {
		PDF_LINE_WIDTH_FACTOR = value as typeof PDF_LINE_WIDTH_FACTOR;
	},
	ARC_SEGMENTS_FOR_LOOPS_CHECK: (value: SettingValue) => {
		ARC_SEGMENTS_FOR_LOOPS_CHECK = value as typeof ARC_SEGMENTS_FOR_LOOPS_CHECK;
	},
	ZOOM_STEP_MULTIPLIER: (value: SettingValue) => {
		ZOOM_STEP_MULTIPLIER = value as typeof ZOOM_STEP_MULTIPLIER;
	},
	DEFAULT_ZOOM_MARGIN: (value: SettingValue) => {
		DEFAULT_ZOOM_MARGIN = value as typeof DEFAULT_ZOOM_MARGIN;
	},
	AUTOSAVE_DELAY: (value: SettingValue) => {
		AUTOSAVE_DELAY = value as typeof AUTOSAVE_DELAY;
	},
	DIMMED_ENTITY_ALPHA: (value: SettingValue) => {
		DIMMED_ENTITY_ALPHA = value as typeof DIMMED_ENTITY_ALPHA;
	},
	GRID_MINOR_LINE_COLOR: (value: SettingValue) => {
		GRID_MINOR_LINE_COLOR = value as typeof GRID_MINOR_LINE_COLOR;
	},
	GRID_MAJOR_LINE_COLOR: (value: SettingValue) => {
		GRID_MAJOR_LINE_COLOR = value as typeof GRID_MAJOR_LINE_COLOR;
	},
	GRID_AXIS_LINE_COLOR: (value: SettingValue) => {
		GRID_AXIS_LINE_COLOR = value as typeof GRID_AXIS_LINE_COLOR;
	},
};

export type SettingKey = keyof typeof SETTERS;

const SETTING_UNITS: Partial<Record<SettingKey, SettingUnit>> = {
	SVG_MARGIN: 'units',
	PDF_MARGIN: 'units',
	CURSOR_SIZE: 'px',
	ANGLE_GUIDES_DASH: 'px',
	SNAP_POINT_DISTANCE: 'px',
	SNAP_ANGLE_DISTANCE: 'px',
	HIGHLIGHT_ENTITY_DISTANCE: 'px',
	SNAP_POINT_SIZE: 'px',
	HOVERED_SNAP_POINT_TIME: 'ms',
	MEASUREMENT_EXTENSION_LENGTH: 'units',
	MEASUREMENT_ORIGIN_MARGIN: 'units',
	MEASUREMENT_DEFAULT_OFFSET: 'units',
	ARROW_HEAD_LENGTH: 'units',
	ARROW_HEAD_WIDTH: 'units',
	MEASUREMENT_LABEL_OFFSET: 'units',
	MEASUREMENT_FONT_SIZE: 'units',
	SELECTION_RECTANGLE_WIDTH: 'px',
	SELECTION_RECTANGLE_STYLE: 'px',
	GUIDE_LINE_WIDTH: 'px',
	GUIDE_LINE_STYLE: 'px',
	MOUSE_ZOOM_MULTIPLIER: '%',
	CANVAS_INPUT_FIELD_MOUSE_OFFSET: 'px',
	CANVAS_INPUT_FIELD_WIDTH: 'px',
	CANVAS_INPUT_FIELD_HEIGHT: 'px',
	CANVAS_INPUT_FIELD_FONT_SIZE: 'px',
	PDF_LINE_WIDTH_FACTOR: '×',
	ZOOM_STEP_MULTIPLIER: '×',
	DEFAULT_ZOOM_MARGIN: 'px',
	AUTOSAVE_DELAY: 'ms',
	DIMMED_ENTITY_ALPHA: '%',
};

const SETTING_TYPES: Record<SettingKey, SettingDefinition['type']> = {
	SVG_MARGIN: 'number',
	PDF_MARGIN: 'number',
	CURSOR_SIZE: 'number',
	CANVAS_BACKGROUND_COLOR: 'color',
	CANVAS_FOREGROUND_COLOR: 'color',
	ANGLE_GUIDES_COLOR: 'color',
	ANGLE_GUIDES_DASH: 'dash',
	SNAP_POINT_COLOR: 'color',
	SNAP_POINT_DISTANCE: 'number',
	SNAP_ANGLE_DISTANCE: 'number',
	HIGHLIGHT_ENTITY_DISTANCE: 'number',
	SNAP_POINT_SIZE: 'number',
	HOVERED_SNAP_POINT_TIME: 'number',
	MAX_MARKED_SNAP_POINTS: 'number',
	MEASUREMENT_EXTENSION_LENGTH: 'number',
	MEASUREMENT_ORIGIN_MARGIN: 'number',
	MEASUREMENT_DEFAULT_OFFSET: 'number',
	ARROW_HEAD_LENGTH: 'number',
	ARROW_HEAD_WIDTH: 'number',
	MEASUREMENT_DECIMAL_PLACES: 'number',
	MEASUREMENT_LABEL_OFFSET: 'number',
	MEASUREMENT_FONT_SIZE: 'number',
	SELECTION_RECTANGLE_COLOR_INTERSECTION: 'color',
	SELECTION_RECTANGLE_COLOR_CONTAINS: 'color',
	SELECTION_RECTANGLE_WIDTH: 'number',
	SELECTION_RECTANGLE_STYLE: 'dash',
	GUIDE_LINE_COLOR: 'color',
	GUIDE_LINE_WIDTH: 'number',
	GUIDE_LINE_STYLE: 'dash',
	MOUSE_ZOOM_MULTIPLIER: 'number',
	CANVAS_INPUT_FIELD_MOUSE_OFFSET: 'number',
	CANVAS_INPUT_FIELD_WIDTH: 'number',
	CANVAS_INPUT_FIELD_HEIGHT: 'number',
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR: 'color',
	CANVAS_INPUT_FIELD_TEXT_COLOR: 'color',
	CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR: 'color',
	CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR: 'color',
	CANVAS_INPUT_FIELD_FONT_SIZE: 'number',
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR: 'color',
	PDF_LINE_WIDTH_FACTOR: 'number',
	ARC_SEGMENTS_FOR_LOOPS_CHECK: 'number',
	ZOOM_STEP_MULTIPLIER: 'number',
	DEFAULT_ZOOM_MARGIN: 'number',
	AUTOSAVE_DELAY: 'number',
	DIMMED_ENTITY_ALPHA: 'number',
	GRID_MINOR_LINE_COLOR: 'color',
	GRID_MAJOR_LINE_COLOR: 'color',
	GRID_AXIS_LINE_COLOR: 'color',
};

function toLabel(key: string): string {
	const words = key.toLowerCase().split('_');
	return words
		.map((word, index) => (index === 0 ? word[0].toUpperCase() + word.slice(1) : word))
		.join(' ');
}

/**
 * All settings that can be changed by the user in the settings menu
 */
export const SETTING_DEFINITIONS: SettingDefinition[] = (Object.keys(SETTERS) as SettingKey[]).map(
	(key) => ({
		key,
		label: toLabel(key),
		type: SETTING_TYPES[key],
		unit: SETTING_UNITS[key],
	})
);

/**
 * Default values of the settings, captured before any user overrides are applied
 */
export const DEFAULT_SETTINGS: Record<SettingKey, SettingValue> = {
	SVG_MARGIN,
	PDF_MARGIN,
	CURSOR_SIZE,
	CANVAS_BACKGROUND_COLOR,
	CANVAS_FOREGROUND_COLOR,
	ANGLE_GUIDES_COLOR,
	ANGLE_GUIDES_DASH,
	SNAP_POINT_COLOR,
	SNAP_POINT_DISTANCE,
	SNAP_ANGLE_DISTANCE,
	HIGHLIGHT_ENTITY_DISTANCE,
	SNAP_POINT_SIZE,
	HOVERED_SNAP_POINT_TIME,
	MAX_MARKED_SNAP_POINTS,
	MEASUREMENT_EXTENSION_LENGTH,
	MEASUREMENT_ORIGIN_MARGIN,
	MEASUREMENT_DEFAULT_OFFSET,
	ARROW_HEAD_LENGTH,
	ARROW_HEAD_WIDTH,
	MEASUREMENT_DECIMAL_PLACES,
	MEASUREMENT_LABEL_OFFSET,
	MEASUREMENT_FONT_SIZE,
	SELECTION_RECTANGLE_COLOR_INTERSECTION,
	SELECTION_RECTANGLE_COLOR_CONTAINS,
	SELECTION_RECTANGLE_WIDTH,
	SELECTION_RECTANGLE_STYLE,
	GUIDE_LINE_COLOR,
	GUIDE_LINE_WIDTH,
	GUIDE_LINE_STYLE,
	MOUSE_ZOOM_MULTIPLIER,
	CANVAS_INPUT_FIELD_MOUSE_OFFSET,
	CANVAS_INPUT_FIELD_WIDTH,
	CANVAS_INPUT_FIELD_HEIGHT,
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR,
	CANVAS_INPUT_FIELD_TEXT_COLOR,
	CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR,
	CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR,
	CANVAS_INPUT_FIELD_FONT_SIZE,
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
	PDF_LINE_WIDTH_FACTOR,
	ARC_SEGMENTS_FOR_LOOPS_CHECK,
	ZOOM_STEP_MULTIPLIER,
	DEFAULT_ZOOM_MARGIN,
	AUTOSAVE_DELAY,
	DIMMED_ENTITY_ALPHA,
	GRID_MINOR_LINE_COLOR,
	GRID_MAJOR_LINE_COLOR,
	GRID_AXIS_LINE_COLOR,
};

/**
 * Defaults that differ from the dark theme defaults when the light theme is active
 */
const LIGHT_THEME_DEFAULTS: Partial<Record<SettingKey, SettingValue>> = {
	CANVAS_BACKGROUND_COLOR: '#ffffff',
	CANVAS_FOREGROUND_COLOR: '#000000',
	ANGLE_GUIDES_COLOR: '#888888',
	SNAP_POINT_COLOR: '#e08a00',
	SELECTION_RECTANGLE_COLOR_INTERSECTION: '#2e8b00',
	SELECTION_RECTANGLE_COLOR_CONTAINS: '#1e5bd8',
	GUIDE_LINE_COLOR: '#888888',
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR: '#f1efeb',
	CANVAS_INPUT_FIELD_TEXT_COLOR: '#000000',
	CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR: '#ffffff',
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR: '#666666',
	GRID_MINOR_LINE_COLOR: '#eeedeb',
	GRID_MAJOR_LINE_COLOR: '#dddbd7',
	GRID_AXIS_LINE_COLOR: '#bdbab4',
};

const SETTINGS_STORAGE_KEY = 'OPEN_WEB_CAD__SETTINGS';

/**
 * Event dispatched on window whenever a setting changes
 */
export const SETTINGS_CHANGE_EVENT = 'openwebcad-settings-change';

interface StoredSettings {
	theme: Theme;
	overrides: Partial<Record<SettingKey, SettingValue>>;
}

let settingOverrides: Partial<Record<SettingKey, SettingValue>> = {};

export function getDefaultSettingValue(key: SettingKey): SettingValue {
	return (THEME === 'light' ? LIGHT_THEME_DEFAULTS[key] : undefined) ?? DEFAULT_SETTINGS[key];
}

export function getSettingValue(key: SettingKey): SettingValue {
	return settingOverrides[key] ?? getDefaultSettingValue(key);
}

function applySettings(): void {
	for (const key of Object.keys(SETTERS) as SettingKey[]) {
		SETTERS[key](getSettingValue(key));
	}
	if (globalThis.document) {
		document.documentElement.dataset.theme = THEME;
	}
}

function saveSettings(): void {
	try {
		const stored: StoredSettings = { theme: THEME, overrides: settingOverrides };
		globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stored));
	} catch {
		// Settings will not persist, eg: in a private window
	}
	globalThis.dispatchEvent?.(new Event(SETTINGS_CHANGE_EVENT));
}

export function setTheme(theme: Theme): void {
	THEME = theme;
	applySettings();
	saveSettings();
}

/**
 * Override a setting, pass undefined to reset it to its default value
 */
export function setSetting(key: SettingKey, value: SettingValue | undefined): void {
	if (value === undefined) {
		delete settingOverrides[key];
	} else {
		settingOverrides[key] = value;
	}
	applySettings();
	saveSettings();
}

export function resetAllSettings(): void {
	settingOverrides = {};
	applySettings();
	saveSettings();
}

function loadSettings(): void {
	try {
		const json = globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY);
		if (!json) return;
		const stored = JSON.parse(json) as Partial<StoredSettings>;
		THEME = stored.theme === 'light' ? 'light' : 'dark';
		settingOverrides = Object.fromEntries(
			Object.entries(stored.overrides ?? {}).filter(([key]) => key in SETTERS)
		);
	} catch {
		// Ignore corrupt settings and use the defaults
	}
}

loadSettings();
applySettings();
