/**
 * Very small number that will be used to compare floating point numbers on equality
 * since javascript isn't always very accurate with floating point numbers
 */
export const EPSILON = 1e-6;

/**
 * Margin around the SVG elements when exporting to a .svg image
 */
export const SVG_MARGIN = 10;

/**
 * The width and height of the cross that will be drawn instead of the cursor when hovering the drawing canvas
 */
export const CURSOR_SIZE = 30;

/**
 * The background color of the canvas
 */
export const CANVAS_BACKGROUND_COLOR = '#111';

/**
 * The foreground color of the canvas
 * This will be the color of the lines you draw
 */
export const CANVAS_FOREGROUND_COLOR = '#fff';

/**
 * The color of the angle guide lines that are drawn when you are close to an angle step from the last drawn point
 */
export const ANGLE_GUIDES_COLOR = '#999999';

/**
 * The color of the snap points that are drawn when you are close to a snap point
 * These are the shapes you see when you get near an line endpoint or a circle center point, ...
 */
export const SNAP_POINT_COLOR = '#FFFF00';

/**
 * How far a snap point can be from the mouse to still be considered a close snap point
 */
export const SNAP_POINT_DISTANCE = 15;

/**
 * How far the mouse can be from an angle guide line to show the "near angle step" snap point
 */
export const SNAP_ANGLE_DISTANCE = 15;

/**
 * How far the mouse can be from an entity to highlight it and subsequently select it when you click
 */
export const HIGHLIGHT_ENTITY_DISTANCE = 15;

/**
 * The size of the snap point indicator shapes that are shown on active snap points
 */
export const SNAP_POINT_SIZE = 15;

/**
 * How long you need to hover over a snap point to make it a marked snap point that will show angle guides
 * in milliseconds
 */
export const HOVERED_SNAP_POINT_TIME = 1000;

/**
 * Maximum number of snap points that can be marked at the same time
 * Marked snap points also get angle guides
 */
export const MAX_MARKED_SNAP_POINTS = 3;

/**
 * Length of the extensions that extend past the measurement arrows of a measurement
 */
export const MEASUREMENT_EXTENSION_LENGTH = 20;

/**
 * Distance that measurement lines stay away from the point of origin of the measurement
 */
export const MEASUREMENT_ORIGIN_MARGIN = 20;

/**
 * Distance the measurement is drawn while drawing the start and endpoints of the measurements but before the user decides the offset point
 */
export const MEASUREMENT_DEFAULT_OFFSET = 200;

/**
 * Length of the arrow heads for measurements
 */
export const ARROW_HEAD_LENGTH = 20;

/**
 * Width of the arrow heads for measurements
 */
export const ARROW_HEAD_WIDTH = 7;

/**
 * Number of decimals to show on measurements. eg: 2 would give a measurement of: 503.32
 */
export const MEASUREMENT_DECIMAL_PLACES = 2;

/**
 * Distance between the measurement line and the label of the measurement
 */
export const MEASUREMENT_LABEL_OFFSET = 20;

/**
 * Size of the measurement labels containing the length of the measurements
 */
export const MEASUREMENT_FONT_SIZE = 40;

/**
 * Colors for the selection rectangle
 */
export const SELECTION_RECTANGLE_COLOR_INTERSECTION = '#b6ff9a';
export const SELECTION_RECTANGLE_COLOR_CONTAINS = '#6899f3';
export const SELECTION_RECTANGLE_WIDTH = 1;
export const SELECTION_RECTANGLE_STYLE = [5, 5]; // Dashed line

/**
 * Angle guides and move tool line styles
 */
export const GUIDE_LINE_COLOR = '#999';
export const GUIDE_LINE_WIDTH = 1;
export const GUIDE_LINE_STYLE = [5, 5]; // Dashed line

/**
 * Mouse zoom multiplier. Higher zooms faster for each mouse scroll
 */
export const MOUSE_ZOOM_MULTIPLIER = 0.1;

/**
 * Canvas input field offset to mouse location
 */
export const CANVAS_INPUT_FIELD_MOUSE_OFFSET = 20;

/**
 * Canvas input field width
 */
export const CANVAS_INPUT_FIELD_WIDTH = 150;

/**
 * Canvas input field height
 */
export const CANVAS_INPUT_FIELD_HEIGHT = 20;

/**
 * Canvas input field background color
 */
export const CANVAS_INPUT_FIELD_BACKGROUND_COLOR = '#161616';

/**
 * Canvas input field text color
 */
export const CANVAS_INPUT_FIELD_TEXT_COLOR = '#FFF';

/**
 * Canvas input field background color when text is selected
 */
export const CANVAS_INPUT_FIELD_SELECTION_BACKGROUND_COLOR = '#1e90ff';

/**
 * Canvas input field text color when text is selected
 */
export const CANVAS_INPUT_FIELD_SELECTION_TEXT_COLOR = '#000';

/**
 * Canvas input field text size in pixels
 */
export const CANVAS_INPUT_FIELD_FONT_SIZE = 16;

/**
 * Canvas input field instruction text color
 */
export const CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR = '#999';

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
