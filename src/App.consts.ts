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
export const ANGLE_GUIDES_COLOR = '#666666';

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
 * Colors for the selection rectangle
 */
export const SELECTION_RECTANGLE_COLOR_INTERSECTION = '#b6ff9a';
export const SELECTION_RECTANGLE_COLOR_CONTAINS = '#6899f3';

/**
 * Mouse zoom multiplier. Higher zooms faster for each mouse scroll
 */
export const MOUSE_ZOOM_MULTIPLIER = 0.1;

export const COLOR_LIST = [
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
