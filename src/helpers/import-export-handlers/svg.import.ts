import { Matrix, Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { type ElementNode, type Node, parse } from 'svg-parser';
import { CircleEntity } from '../../entities/CircleEntity';
import { EllipseEntity } from '../../entities/EllipseEntity.ts';
import type { Entity } from '../../entities/Entity';
import { LineEntity } from '../../entities/LineEntity';
import { RectangleEntity } from '../../entities/RectangleEntity';
import { getActiveLineColor, getEntities, setEntities } from '../../state';
import { zoomToBounds } from '../../tools/zoom-tool.helpers.ts';
import { svgPathToSegments } from '../convert-svg-path-to-line-segments.ts';
import { getBoundingBoxOfMultipleEntities } from '../get-bounding-box-of-multiple-entities.ts';
import { middle } from '../middle.ts';
import { parseCssColor } from './parse-css-color.ts';
import { transformEntity, transformPoint } from './transform-entity.ts';

/**
 * Numbers in svg attributes can be separated by spaces, commas or new lines, or by nothing at all, eg: 10-5 or .5.5
 */
const NUMBER_REGEX = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

const TRANSFORM_REGEX = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;

/**
 * Elements whose children are only drawn when they are referenced, eg: the shapes of a clip path
 */
const NOT_DRAWN_ELEMENTS = ['defs', 'clipPath', 'mask', 'symbol', 'marker', 'pattern'];

/**
 * Black strokes are shown in white, since the canvas is black, like dxf color 7 and the inverse of getExportColor
 */
const BLACK_STROKE_COLOR = '#ffffff';

const TO_RADIANS = Math.PI / 180;

/**
 * Transformation and stroke that an element inherits from its parent groups
 */
interface SvgContext {
	matrix: Matrix;
	stroke: string | undefined;
}

function parseNumbers(value: string): number[] {
	return (value.match(NUMBER_REGEX) ?? []).map(Number);
}

/**
 * Number attribute of an element, eg: the x of a rectangle, which is 0 when it's missing
 */
function getNumber(element: ElementNode, name: string, defaultValue = 0): number {
	const value = Number.parseFloat(String(element.properties?.[name] ?? ''));
	return Number.isFinite(value) ? value : defaultValue;
}

function getPoints(element: ElementNode): Point[] {
	const coordinates = parseNumbers(String(element.properties?.points ?? ''));
	if (coordinates.length % 2 !== 0) {
		// Svg viewers draw the points up to the last complete point
		console.warn(`Ignoring the last coordinate of an svg ${element.tagName}, it has an odd number`);
	}
	const points: Point[] = [];
	for (let index = 0; index + 1 < coordinates.length; index += 2) {
		points.push(new Point(coordinates[index], coordinates[index + 1]));
	}
	return points;
}

/**
 * Converts an svg transform attribute, eg: translate(10, 0) rotate(45), into one matrix
 * The transformations are applied from right to left, so the last one is applied first
 */
export function parseSvgTransform(transform: string): Matrix {
	let matrix = new Matrix();
	for (const [, name, parameterList] of transform.matchAll(TRANSFORM_REGEX)) {
		const parameters = parseNumbers(parameterList);
		switch (name) {
			case 'matrix':
				if (parameters.length === 6) {
					const [a, b, c, d, e, f] = parameters;
					matrix = matrix.multiply(new Matrix(a, b, c, d, e, f));
				}
				break;
			case 'translate':
				matrix = matrix.translate(parameters[0] ?? 0, parameters[1] ?? 0);
				break;
			case 'scale':
				matrix = matrix.scale(parameters[0] ?? 1, parameters[1] ?? parameters[0] ?? 1);
				break;
			case 'rotate':
				matrix = matrix.rotate(
					(parameters[0] ?? 0) * TO_RADIANS,
					parameters[1] ?? 0,
					parameters[2] ?? 0
				);
				break;
			case 'skewX':
				matrix = matrix.multiply(
					new Matrix(1, 0, Math.tan((parameters[0] ?? 0) * TO_RADIANS), 1, 0, 0)
				);
				break;
			case 'skewY':
				matrix = matrix.multiply(
					new Matrix(1, Math.tan((parameters[0] ?? 0) * TO_RADIANS), 0, 1, 0, 0)
				);
				break;
		}
	}
	return matrix;
}

/**
 * Stroke of an element, the style attribute takes precedence over the stroke attribute
 */
function getStroke(element: ElementNode): string | undefined {
	const style = String(element.properties?.style ?? '');
	const styleStroke = style.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i)?.[1];
	const stroke = (styleStroke ?? element.properties?.stroke)?.toString().trim();
	// These values use the stroke of the parent
	return stroke && stroke !== 'inherit' && stroke !== 'currentColor' ? stroke : undefined;
}

function getLineColor(stroke: string | undefined): string {
	const color = stroke ? parseCssColor(stroke) : null;
	if (!color) {
		return getActiveLineColor();
	}
	const isBlack = /^#0[0-9a-f]0[0-9a-f]0[0-9a-f]$/.test(color);
	return isBlack ? BLACK_STROKE_COLOR : color;
}

function createLines(points: Point[]): LineEntity[] {
	return points.slice(1).flatMap((point, index) => {
		const previousPoint = points[index];
		return previousPoint.equalTo(point) ? [] : [new LineEntity(previousPoint, point)];
	});
}

/**
 * Converts one svg shape into entities in svg coordinates, with the transformation of the element and its groups applied
 */
function convertElement(element: ElementNode, matrix: Matrix): Entity[] {
	const transformPoints = (points: Point[]) => points.map((point) => transformPoint(matrix, point));
	switch (element.tagName) {
		case 'rect': {
			const width = getNumber(element, 'width');
			const height = getNumber(element, 'height');
			if (!(width > 0) || !(height > 0)) {
				return [];
			}
			const corner = new Point(getNumber(element, 'x'), getNumber(element, 'y'));
			return [
				transformEntity(
					new RectangleEntity(corner, new Point(corner.x + width, corner.y + height)),
					matrix
				),
			];
		}
		case 'circle': {
			const radius = getNumber(element, 'r');
			const center = new Point(getNumber(element, 'cx'), getNumber(element, 'cy'));
			return radius > 0 ? [transformEntity(new CircleEntity(center, radius), matrix)] : [];
		}
		case 'ellipse': {
			// A missing radius is the same as the other radius
			const radiusX = getNumber(element, 'rx', getNumber(element, 'ry'));
			const radiusY = getNumber(element, 'ry', radiusX);
			const center = new Point(getNumber(element, 'cx'), getNumber(element, 'cy'));
			if (!(radiusX > 0) || !(radiusY > 0)) {
				return [];
			}
			if (radiusX === radiusY) {
				return [transformEntity(new CircleEntity(center, radiusX), matrix)];
			}
			const ellipse =
				radiusX > radiusY
					? new EllipseEntity(center, new Point(center.x + radiusX, center.y), radiusY / radiusX)
					: new EllipseEntity(center, new Point(center.x, center.y + radiusY), radiusX / radiusY);
			return [transformEntity(ellipse, matrix)];
		}
		case 'line':
			return createLines(
				transformPoints([
					new Point(getNumber(element, 'x1'), getNumber(element, 'y1')),
					new Point(getNumber(element, 'x2'), getNumber(element, 'y2')),
				])
			);
		case 'polyline':
			return createLines(transformPoints(getPoints(element)));
		case 'polygon': {
			const points = transformPoints(getPoints(element));
			return points.length > 1 ? createLines([...points, points[0]]) : [];
		}
		case 'path': {
			if (typeof element.properties?.d !== 'string') {
				return [];
			}
			return svgPathToSegments(element.properties.d).flatMap((line) =>
				createLines(transformPoints([new Point(line.x1, line.y1), new Point(line.x2, line.y2)]))
			);
		}
		default:
			return [];
	}
}

/**
 * Converts the shapes of an svg document into entities in svg coordinates
 * Texts aren't imported yet // TODO convert svg text to a TextEntity
 */
function svgChildrenToEntities(children: (Node | string)[]): Entity[] {
	const entities: Entity[] = [];
	const rootContext: SvgContext = { matrix: new Matrix(), stroke: undefined };
	// Depth first, so the entities keep the order of the svg document
	const elementsToProcess: { node: Node | string; context: SvgContext }[] = children
		.map((node) => ({ node, context: rootContext }))
		.reverse();
	while (elementsToProcess.length) {
		const { node, context } = elementsToProcess.pop() as (typeof elementsToProcess)[number];
		// Character data and text nodes don't contain shapes
		if (typeof node === 'string' || node.type !== 'element') {
			continue;
		}
		if (NOT_DRAWN_ELEMENTS.includes(node.tagName ?? '') || node.properties?.display === 'none') {
			continue;
		}
		const transform = node.properties?.transform;
		const elementContext: SvgContext = {
			matrix: transform
				? context.matrix.multiply(parseSvgTransform(String(transform)))
				: context.matrix,
			stroke: getStroke(node) ?? context.stroke,
		};
		const lineColor = getLineColor(elementContext.stroke);
		for (const entity of convertElement(node, elementContext.matrix)) {
			entity.lineColor = lineColor;
			entities.push(entity);
		}
		for (const child of [...(node.children ?? [])].reverse()) {
			elementsToProcess.push({ node: child, context: elementContext });
		}
	}
	return entities;
}

/**
 * Converts the contents of an svg file into entities
 */
export function convertSvgToEntities(svg: string): Entity[] {
	const data = parse(svg);

	const svgEntities: Entity[] = svgChildrenToEntities(data.children);

	// We still need to flip the image top to bottom since the coordinate system of svg has a y-axis that goes down
	// And the world coordinate system of this application has a mathematical y-axis that goes up
	const boundingBox = getBoundingBoxOfMultipleEntities(svgEntities);
	const centerPoint = new Point(
		middle(boundingBox.minX, boundingBox.maxX),
		middle(boundingBox.minY, boundingBox.maxY)
	);

	const mirrorAxis = new LineEntity(centerPoint, new Point(centerPoint.x + 1, centerPoint.y));
	for (const svgEntity of svgEntities) {
		svgEntity.mirror(mirrorAxis);
	}
	return svgEntities;
}

/**
 * Parse the SVG file selected in the file dialog
 * Generate entities from the XML data
 * Add the entities to the drawing
 */
export async function importEntitiesFromSvgFile(file: File | null | undefined): Promise<void> {
	if (!file) {
		return;
	}
	try {
		const svgEntities = convertSvgToEntities(await file.text());
		if (!svgEntities.length) {
			toast.info('No supported shapes found in the SVG file.');
			return;
		}
		setEntities([...getEntities(), ...svgEntities], true);
		zoomToBounds();
	} catch (error) {
		toast.error('Failed to load SVG file');
		console.error(error);
	}
}
