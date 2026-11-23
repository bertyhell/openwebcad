import { Matrix, Point, Vector } from '@flatten-js/core';
import type { Entities as DxfEntities } from 'dxf';
import { uniqBy } from 'es-toolkit';
import { toast } from 'react-toastify';
import type { Layer } from '../../App.types.ts';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import { EllipseEntity } from '../../entities/EllipseEntity.ts';
import type { Entity } from '../../entities/Entity.ts';
import { FillEntity } from '../../entities/FillEntity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { PointEntity } from '../../entities/PointEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
import { SplineEntity } from '../../entities/SplineEntity.ts';
import { TextEntity } from '../../entities/TextEntity.ts';
import {
	getActiveLineColor,
	getActiveLineWidth,
	getEntities,
	getLayers,
	setEntities,
	setLayers,
} from '../../state';
import { zoomToBounds } from '../../tools/zoom-tool.helpers.ts';
import { getNewLayer } from '../get-new-layer.ts';
import { toHex } from '../rgb-to-hex-color.ts';
import { transformEntity } from './transform-entity.ts';

/**
 * Subset of the dxf library that is needed to convert a file, so it can be loaded lazily
 */
export interface DxfLibrary {
	Helper: new (
		contents: string
	) => {
		parsed: unknown;
		denormalised: DxfEntities.Entity[] | null;
	};
	colors: number[][];
}

interface DxfLayerTable {
	name: string;
	/**
	 * A negative color means the layer is turned off
	 */
	colorNumber?: number;
	flags?: number;
}

const FROZEN_LAYER_FLAG = 1;
const LOCKED_LAYER_FLAG = 4;

interface DxfVertex {
	x: number;
	y: number;
	bulge?: number;
}

/**
 * Transformation of a block insert, the dxf library adds them to the entities of the block
 */
interface DxfTransform {
	x?: number;
	y?: number;
	scaleX?: number;
	scaleY?: number;
	rotation?: number;
	extrusionZ?: number;
}

/**
 * Loosely typed dxf entity, the typings of the dxf library don't cover every property it returns
 */
interface DxfEntity {
	type: string;
	layer?: string;
	colorNumber?: number;
	visible?: boolean;
	paperSpace?: number;
	extrusionZ?: number;
	/**
	 * Transformations of the blocks the entity is inserted with, starting with the innermost block
	 */
	transforms?: DxfTransform[];
	[key: string]: unknown;
}

interface DxfBlock {
	x?: number;
	y?: number;
	entities?: DxfEntity[];
}

const BY_BLOCK_COLOR = 0;
const BY_LAYER_COLOR = 256;
const WHITE_COLOR = 7;

export interface DxfConversionResult {
	entities: Entity[];
	/**
	 * Layers of the dxf file that don't exist in the drawing yet
	 */
	newLayers: Layer[];
	unsupportedTypes: string[];
}

function aciToHex(colors: number[][], colorNumber: number | undefined): string | null {
	if (colorNumber === undefined || colorNumber <= 0 || colorNumber >= BY_LAYER_COLOR) {
		return null;
	}
	if (colorNumber === WHITE_COLOR) {
		// Color 7 is black on a white background and white on a dark background, like this app
		return '#ffffff';
	}
	const rgb = colors[colorNumber];
	return rgb ? toHex(rgb[0], rgb[1], rgb[2]) : null;
}

function getLayerTables(parsed: unknown): DxfLayerTable[] {
	const layers = (parsed as { tables?: { layers?: unknown } } | null)?.tables?.layers;
	if (!layers) {
		return [];
	}
	return (Array.isArray(layers) ? layers : Object.values(layers)) as DxfLayerTable[];
}

/**
 * Entities whose coordinates are in their object coordinate system (OCS) instead of the world coordinate system
 */
const OCS_ENTITY_TYPES = ['ARC', 'CIRCLE', 'LWPOLYLINE', 'POLYLINE', 'TEXT', 'SOLID'];

/**
 * Converts the object coordinate system of a 2d entity to world coordinates
 * Entities that are mirrored in AutoCAD get an extrusion direction pointing down, which mirrors their x axis
 */
function getObjectCoordinateSystemMatrix(extrusionZ: number | undefined): Matrix {
	return extrusionZ !== undefined && extrusionZ < 0 ? new Matrix(-1, 0, 0, 1, 0, 0) : new Matrix();
}

/**
 * Combines the transformations of the blocks an entity is inserted with
 * Each insert scales, rotates and moves the block to its insertion point, which is in the object coordinate system of the insert
 */
function getInsertMatrix(transforms: DxfTransform[] = []): Matrix {
	return transforms.reduce((matrix, transform) => {
		// A missing scale is 1, the dxf library treats a scale of 0 the same way
		const insertMatrix = getObjectCoordinateSystemMatrix(transform.extrusionZ)
			.translate(transform.x ?? 0, transform.y ?? 0)
			.rotate(((transform.rotation ?? 0) * Math.PI) / 180)
			.scale(transform.scaleX || 1, transform.scaleY || 1);
		return insertMatrix.multiply(matrix);
	}, new Matrix());
}

/**
 * The dxf library moves the lines, polylines, circles, ellipses, arcs and splines of a block relative to the base point of the block,
 * but not its texts, points, solids and nested inserts, so those are moved here before the library inserts the blocks
 */
function moveBlockEntitiesToBasePoint(parsed: unknown): void {
	const blocks = (parsed as { blocks?: DxfBlock[] } | null)?.blocks ?? [];
	for (const block of blocks) {
		const baseX = block.x ?? 0;
		const baseY = block.y ?? 0;
		if (!baseX && !baseY) {
			continue;
		}
		const move = (target: Record<string, unknown>, xKey: string, yKey: string) => {
			if (typeof target[xKey] === 'number' && typeof target[yKey] === 'number') {
				target[xKey] = (target[xKey] as number) - baseX;
				target[yKey] = (target[yKey] as number) - baseY;
			}
		};
		for (const entity of block.entities ?? []) {
			switch (entity.type) {
				case 'TEXT':
					move(entity, 'x', 'y');
					move(entity, 'x2', 'y2');
					break;
				case 'MTEXT':
				case 'POINT':
				case 'INSERT':
					move(entity, 'x', 'y');
					break;
				case 'SOLID':
					for (const corner of (entity.corners as Record<string, unknown>[] | undefined) ?? []) {
						move(corner, 'x', 'y');
					}
					break;
			}
		}
	}
}

/**
 * Arc between two polyline vertices, described by the bulge of the first vertex
 * The bulge is the tangent of a quarter of the arc angle, positive for counterclockwise arcs
 */
export function createArcFromBulge(start: Point, end: Point, bulge: number): ArcEntity {
	const sweep = 4 * Math.atan(bulge);
	const chord = start.distanceTo(end)[0];
	const radius = chord / (2 * Math.sin(Math.abs(sweep) / 2));
	const chordMiddle = new Point((start.x + end.x) / 2, (start.y + end.y) / 2);
	// Distance from the middle of the chord to the center, the center lies to the left for counterclockwise arcs
	const sagittaDistance = radius * Math.cos(sweep / 2);
	const chordDirection = new Vector(start, end).normalize();
	const towardsCenter = chordDirection.rotate90CCW().multiply(Math.sign(bulge) * sagittaDistance);
	const center = chordMiddle.translate(towardsCenter);
	return new ArcEntity(
		center,
		radius,
		Math.atan2(start.y - center.y, start.x - center.x),
		Math.atan2(end.y - center.y, end.x - center.x),
		bulge > 0
	);
}

function convertVertices(vertices: DxfVertex[], closed: boolean): Entity | null {
	if (vertices.length < 2) {
		return null;
	}
	const segments: Entity[] = [];
	const segmentCount = closed ? vertices.length : vertices.length - 1;
	for (let index = 0; index < segmentCount; index++) {
		const vertex = vertices[index];
		const nextVertex = vertices[(index + 1) % vertices.length];
		const start = new Point(vertex.x, vertex.y);
		const end = new Point(nextVertex.x, nextVertex.y);
		if (start.equalTo(end)) {
			continue;
		}
		segments.push(
			vertex.bulge ? createArcFromBulge(start, end, vertex.bulge) : new LineEntity(start, end)
		);
	}
	if (!segments.length) {
		return null;
	}
	return segments.length === 1 ? segments[0] : new PolyLineEntity(segments);
}

/**
 * Largest angle between two points that are used to approximate a partial ellipse with a spline
 */
const ELLIPSE_SAMPLE_ANGLE = Math.PI / 16;

/**
 * Number of points per knot span that are used to approximate a dxf spline
 */
const SPLINE_SAMPLES_PER_SPAN = 8;

/**
 * EllipseEntity is always a full ellipse, so a partial ellipse becomes a spline through points on the ellipse
 * Ellipses are in world coordinates, a downward extrusion direction only makes their parameter go clockwise
 */
function convertEllipse(dxfEntity: DxfEntity): Entity | null {
	const number = (key: string): number => Number(dxfEntity[key] ?? 0);
	const center = new Point(number('x'), number('y'));
	const majorAxis = new Vector(number('majorX'), number('majorY'));
	const ratio = number('axisRatio');
	if (majorAxis.length === 0 || !(ratio > 0)) {
		return null;
	}
	const startParameter = Number(dxfEntity.startAngle ?? 0);
	const endParameter = Number(dxfEntity.endAngle ?? 2 * Math.PI);
	let sweep = (endParameter - startParameter) % (2 * Math.PI);
	if (sweep <= 1e-9) {
		sweep += 2 * Math.PI;
	}
	if (sweep >= 2 * Math.PI - 1e-9) {
		return new EllipseEntity(center, center.translate(majorAxis), ratio);
	}
	const minorAxis = (
		dxfEntity.extrusionZ !== undefined && dxfEntity.extrusionZ < 0
			? majorAxis.rotate90CW()
			: majorAxis.rotate90CCW()
	).multiply(ratio);
	const stepCount = Math.max(2, Math.ceil(sweep / ELLIPSE_SAMPLE_ANGLE));
	return new SplineEntity(
		Array.from({ length: stepCount + 1 }, (_, index) => {
			const parameter = startParameter + (sweep * index) / stepCount;
			return center
				.translate(majorAxis.multiply(Math.cos(parameter)))
				.translate(minorAxis.multiply(Math.sin(parameter)));
		})
	);
}

/**
 * Point on a (rational) b-spline at parameter u, using de Boor's algorithm
 * The control points are combined in homogeneous coordinates, so their weights pull the curve towards them
 */
function getBSplinePoint(
	u: number,
	degree: number,
	controlPoints: Point[],
	weights: number[],
	knots: number[]
): Point {
	// Knot span that contains u, at the end of the spline this is the last span
	let span = degree;
	while (span < controlPoints.length - 1 && u >= knots[span + 1]) {
		span++;
	}
	const points = Array.from({ length: degree + 1 }, (_, index) => {
		const controlPointIndex = span - degree + index;
		const weight = weights[controlPointIndex] ?? 1;
		const { x, y } = controlPoints[controlPointIndex];
		return [x * weight, y * weight, weight];
	});
	for (let level = 1; level <= degree; level++) {
		for (let index = degree; index >= level; index--) {
			const knotIndex = span - degree + index;
			const knotDistance = knots[knotIndex + degree - level + 1] - knots[knotIndex];
			const alpha = knotDistance === 0 ? 0 : (u - knots[knotIndex]) / knotDistance;
			points[index] = points[index].map(
				(value, coordinate) => (1 - alpha) * points[index - 1][coordinate] + alpha * value
			);
		}
	}
	const [x, y, weight] = points[degree];
	return new Point(x / weight, y / weight);
}

/**
 * SplineEntity goes through its points, but a dxf spline only follows its control points,
 * so the spline becomes a SplineEntity through points on the dxf spline
 */
function convertSpline(dxfEntity: DxfEntity): Entity | null {
	const controlPoints = ((dxfEntity.controlPoints as DxfVertex[] | undefined) ?? []).map(
		(controlPoint) => new Point(controlPoint.x, controlPoint.y)
	);
	const knots = (dxfEntity.knots as number[] | undefined) ?? [];
	const degree = Number(dxfEntity.degree ?? 0);
	const dxfWeights = (dxfEntity.weights as number[] | undefined) ?? [];
	const weights = dxfWeights.length === controlPoints.length ? dxfWeights : [];
	if (
		degree < 1 ||
		controlPoints.length <= degree ||
		knots.length !== controlPoints.length + degree + 1
	) {
		return null;
	}
	if (degree === 1) {
		return convertVertices(controlPoints, false);
	}
	const points: Point[] = [];
	for (let span = degree; span < controlPoints.length; span++) {
		const spanStart = knots[span];
		const spanEnd = knots[span + 1];
		if (!(spanEnd > spanStart)) {
			continue;
		}
		for (let step = 0; step < SPLINE_SAMPLES_PER_SPAN; step++) {
			const u = spanStart + ((spanEnd - spanStart) * step) / SPLINE_SAMPLES_PER_SPAN;
			points.push(getBSplinePoint(u, degree, controlPoints, weights, knots));
		}
	}
	points.push(getBSplinePoint(knots[controlPoints.length], degree, controlPoints, weights, knots));
	return points.length >= 2 ? new SplineEntity(points) : null;
}

/**
 * A solid is a filled triangle or quadrilateral, its outline goes from the first to the second, fourth and third corner
 */
function convertSolid(dxfEntity: DxfEntity): FillEntity | null {
	const corners = ((dxfEntity.corners as Partial<DxfVertex>[] | undefined) ?? [])
		.filter(
			(corner): corner is DxfVertex => typeof corner.x === 'number' && typeof corner.y === 'number'
		)
		.map((corner) => new Point(corner.x, corner.y));
	const outline = corners.length === 4 ? [corners[0], corners[1], corners[3], corners[2]] : corners;
	// Triangles repeat their last corner
	const uniqueCorners = outline.filter(
		(corner, index) => !corner.equalTo(outline[(index + 1) % outline.length])
	);
	if (uniqueCorners.length < 3) {
		return null;
	}
	return new FillEntity(
		new PolyLineEntity(
			uniqueCorners.map(
				(corner, index) => new LineEntity(corner, uniqueCorners[(index + 1) % uniqueCorners.length])
			)
		)
	);
}

/**
 * Removes MTEXT formatting codes, eg: {\fArial;Hello}\PWorld => Hello World
 */
export function stripMTextFormatting(text: string): string {
	return text
		.replace(/\\P/g, ' ')
		.replace(/\\[A-Za-z][^;\\{}]*;/g, '')
		.replace(/\\[~]/g, ' ')
		.replace(/[{}]/g, '')
		.trim();
}

type TextAlign = 'left' | 'center' | 'right';

/**
 * Creates a text from its alignment point in the dxf file
 * TextEntity draws its text vertically centered on its base point,
 * so the alignment point is moved up or down by a part of the text height, eg: 0.5 moves a baseline to the middle of the text
 */
function createText(
	label: string,
	alignmentPoint: Point,
	height: number,
	direction: Vector,
	textAlign: TextAlign,
	heightsToMiddle: number
): TextEntity | null {
	if (!label || !(height > 0)) {
		return null;
	}
	const textDirection = direction.normalize();
	return new TextEntity(
		label,
		alignmentPoint.translate(textDirection.rotate90CCW().multiply(heightsToMiddle * height)),
		{ fontSize: height, textAlign, textDirection }
	);
}

const TEXT_ALIGNMENTS: TextAlign[] = ['left', 'center', 'right'];

const ALIGNED_TEXT = 3;
const MIDDLE_TEXT = 4;
const FIT_TEXT = 5;

/**
 * Distance from the vertical alignment of a text to its middle, relative to the text height
 * Baseline and bottom are treated the same, since the descent of the letters is small and depends on the font
 */
const TEXT_HEIGHTS_TO_MIDDLE: Record<number, number> = {
	0: 0.5, // Baseline
	1: 0.5, // Bottom
	2: 0, // Middle
	3: -0.5, // Top
};

/**
 * Single line dxf text, its horizontal (72) and vertical (73) alignment decide which point positions the text:
 * - left aligned on the baseline: the first point
 * - aligned and fit: the baseline between the first and the second point, the text is stretched to fit
 * - middle: the second point is the center of the text
 * - otherwise: the second point, eg: the right end of the text at the top of the letters
 */
function convertText(dxfEntity: DxfEntity): TextEntity | null {
	const number = (key: string): number => Number(dxfEntity[key] ?? 0);
	const label = String(dxfEntity.string ?? '');
	const height = number('textHeight');
	const hAlign = number('hAlign');
	const vAlign = number('vAlign');
	const firstPoint = new Point(number('x'), number('y'));
	const secondPoint =
		dxfEntity.x2 !== undefined && dxfEntity.y2 !== undefined
			? new Point(number('x2'), number('y2'))
			: null;
	const rotation = (number('rotation') * Math.PI) / 180;
	const direction = new Vector(Math.cos(rotation), Math.sin(rotation));

	if (
		(hAlign === ALIGNED_TEXT || hAlign === FIT_TEXT) &&
		secondPoint &&
		!secondPoint.equalTo(firstPoint)
	) {
		// The text can't be stretched, so it is centered on the baseline between both points
		const middle = new Point(
			(firstPoint.x + secondPoint.x) / 2,
			(firstPoint.y + secondPoint.y) / 2
		);
		return createText(label, middle, height, new Vector(firstPoint, secondPoint), 'center', 0.5);
	}
	if (hAlign === MIDDLE_TEXT) {
		return createText(label, secondPoint ?? firstPoint, height, direction, 'center', 0);
	}
	const usesFirstPoint = (hAlign === 0 && vAlign === 0) || !secondPoint;
	return createText(
		label,
		usesFirstPoint ? firstPoint : secondPoint,
		height,
		direction,
		TEXT_ALIGNMENTS[hAlign] ?? 'left',
		TEXT_HEIGHTS_TO_MIDDLE[vAlign] ?? 0.5
	);
}

/**
 * Multi line dxf text, its attachment point (71) from 1 to 9 is top left, top center, top right, middle left, ..., bottom right
 */
function convertMText(dxfEntity: DxfEntity): TextEntity | null {
	const number = (key: string): number => Number(dxfEntity[key] ?? 0);
	const attachmentPoint = number('attachmentPoint') || 1;
	const direction =
		dxfEntity.xAxisX !== undefined
			? new Vector(number('xAxisX'), number('xAxisY'))
			: new Vector(1, 0);
	const verticalAlignment = Math.floor((attachmentPoint - 1) / 3);
	return createText(
		stripMTextFormatting(String(dxfEntity.string ?? '')),
		new Point(number('x'), number('y')),
		number('nominalTextHeight'),
		direction.length > 0 ? direction : new Vector(1, 0),
		TEXT_ALIGNMENTS[(attachmentPoint - 1) % 3],
		[-0.5, 0, 0.5][verticalAlignment] ?? 0
	);
}

function convertEntity(dxfEntity: DxfEntity): Entity | null {
	const number = (key: string): number => Number(dxfEntity[key] ?? 0);
	switch (dxfEntity.type) {
		case 'LINE': {
			const start = dxfEntity.start as DxfVertex | undefined;
			const end = dxfEntity.end as DxfVertex | undefined;
			if (!start || !end) return null;
			return new LineEntity(new Point(start.x, start.y), new Point(end.x, end.y));
		}
		case 'CIRCLE':
			return number('r') > 0
				? new CircleEntity(new Point(number('x'), number('y')), number('r'))
				: null;
		case 'ARC':
			// Dxf arcs always go counterclockwise from the start angle to the end angle
			return number('r') > 0
				? new ArcEntity(
						new Point(number('x'), number('y')),
						number('r'),
						number('startAngle'),
						number('endAngle'),
						true
					)
				: null;
		case 'LWPOLYLINE':
		case 'POLYLINE':
			return convertVertices(
				(dxfEntity.vertices as DxfVertex[] | undefined) ?? [],
				!!dxfEntity.closed
			);
		case 'POINT':
			return new PointEntity(new Point(number('x'), number('y')));
		case 'ELLIPSE':
			return convertEllipse(dxfEntity);
		case 'SPLINE':
			return convertSpline(dxfEntity);
		case 'SOLID':
			return convertSolid(dxfEntity);
		case 'TEXT':
			return convertText(dxfEntity);
		case 'MTEXT':
			return convertMText(dxfEntity);
		default:
			return null;
	}
}

/**
 * Converts the contents of a dxf file into entities and layers
 * Dxf layers become layers in the drawing, layers with the same name are reused
 */
export function convertDxfToEntities(
	contents: string,
	dxfLibrary: DxfLibrary,
	existingLayers: Layer[]
): DxfConversionResult {
	const helper = new dxfLibrary.Helper(contents);
	// The blocks have to be corrected before the library inserts them, which happens the first time denormalised is read
	moveBlockEntitiesToBasePoint(helper.parsed);
	const dxfEntities = (helper.denormalised ?? []) as unknown as DxfEntity[];
	const layerTables = getLayerTables(helper.parsed);

	const layers = [...existingLayers];
	const newLayers: Layer[] = [];
	const layerIdByName = new Map(existingLayers.map((layer) => [layer.name, layer.id]));
	const getLayerId = (layerName: string): string => {
		const existingLayerId = layerIdByName.get(layerName);
		if (existingLayerId) {
			return existingLayerId;
		}
		const layerTable = layerTables.find((table) => table.name === layerName);
		const layerColorNumber = layerTable?.colorNumber ?? 0;
		const layerFlags = layerTable?.flags ?? 0;
		const newLayer: Layer = {
			...getNewLayer(layers),
			name: layerName,
			// Layers that are turned off or frozen aren't shown in cad applications, so they start hidden
			isVisible: layerColorNumber >= 0 && !(layerFlags & FROZEN_LAYER_FLAG),
			isLocked: !!(layerFlags & LOCKED_LAYER_FLAG),
			color: aciToHex(dxfLibrary.colors, Math.abs(layerColorNumber)) ?? undefined,
		};
		layers.push(newLayer);
		newLayers.push(newLayer);
		layerIdByName.set(layerName, newLayer.id);
		return newLayer.id;
	};

	const entities: Entity[] = [];
	const unsupportedTypes = new Set<string>();
	for (const dxfEntity of dxfEntities) {
		if (dxfEntity.paperSpace || dxfEntity.visible === false) {
			continue; // Only import what is visible in model space
		}
		const convertedEntity = convertEntity(dxfEntity);
		if (!convertedEntity) {
			unsupportedTypes.add(dxfEntity.type);
			continue;
		}
		const objectMatrix = OCS_ENTITY_TYPES.includes(dxfEntity.type)
			? getObjectCoordinateSystemMatrix(dxfEntity.extrusionZ)
			: new Matrix();
		const entity = transformEntity(
			convertedEntity,
			getInsertMatrix(dxfEntity.transforms).multiply(objectMatrix)
		);
		const layerName = dxfEntity.layer ?? '0';
		entity.layerId = getLayerId(layerName);
		const layerColorNumber = layerTables.find((table) => table.name === layerName)?.colorNumber;
		entity.lineColor =
			(dxfEntity.colorNumber !== BY_LAYER_COLOR && dxfEntity.colorNumber !== BY_BLOCK_COLOR
				? aciToHex(dxfLibrary.colors, dxfEntity.colorNumber)
				: null) ??
			aciToHex(dxfLibrary.colors, Math.abs(layerColorNumber ?? 0)) ??
			getActiveLineColor();
		if (entity instanceof FillEntity) {
			entity.fillColor = entity.lineColor;
		}
		entity.lineWidth = getActiveLineWidth();
		entities.push(entity);
	}

	return {
		// Some dxf files contain the same entity twice, entities without a shape (polylines, texts) are always kept
		entities: uniqBy(entities, (entity) => {
			const shape = entity.getShape();
			return shape ? `${JSON.stringify(shape)}|${entity.layerId}|${entity.lineColor}` : entity.id;
		}),
		newLayers,
		unsupportedTypes: [...unsupportedTypes],
	};
}

/**
 * Imports the entities and layers of a dxf file into the drawing
 */
export const importEntitiesFromDxfFile = async (file?: File): Promise<void> => {
	if (!file) {
		return;
	}
	try {
		const [contents, dxfLibrary] = await Promise.all([file.text(), import('dxf')]);
		const { entities, newLayers, unsupportedTypes } = convertDxfToEntities(
			contents,
			dxfLibrary as unknown as DxfLibrary,
			getLayers()
		);

		if (!entities.length) {
			toast.info('No supported entities found in the DXF file.');
			return;
		}
		// Add the layers and entities as one undo step
		setLayers([...getLayers(), ...newLayers]);
		setEntities([...getEntities(), ...entities], true);
		zoomToBounds();
		toast.success(`Imported ${entities.length} entities from ${file.name}`);
		const hiddenLayerNames = newLayers
			.filter((layer) => !layer.isVisible)
			.map((layer) => layer.name);
		if (hiddenLayerNames.length) {
			toast.info(
				`These layers are turned off in the DXF file and are hidden: ${hiddenLayerNames.join(', ')}`
			);
		}
		if (unsupportedTypes.length) {
			toast.info(`Skipped unsupported DXF entities: ${unsupportedTypes.join(', ')}`);
		}
	} catch (error) {
		console.error('Error parsing DXF file:', error);
		toast.error('An error occurred while reading the DXF file. See console for details.');
	}
};
