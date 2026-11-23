import { Matrix, Point, Vector } from '@flatten-js/core';
import type { Entities as DxfEntities } from 'dxf';
import { uniqBy } from 'es-toolkit';
import { toast } from 'react-toastify';
import type { Layer } from '../../App.types.ts';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import type { Entity } from '../../entities/Entity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
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
	colorNumber?: number;
}

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

function createText(
	label: string,
	basePoint: Point,
	height: number,
	rotationRadians: number,
	textAlign: 'left' | 'center' | 'right'
): TextEntity | null {
	if (!label || !(height > 0)) {
		return null;
	}
	return new TextEntity(label, basePoint, {
		fontSize: height,
		textAlign,
		textDirection: new Vector(Math.cos(rotationRadians), Math.sin(rotationRadians)),
	});
}

const TEXT_ALIGNMENTS: ('left' | 'center' | 'right')[] = ['left', 'center', 'right'];

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
		case 'TEXT': {
			const hAlign = number('hAlign');
			// Aligned texts are positioned at their second alignment point
			const useAlignmentPoint = hAlign > 0 && dxfEntity.x2 !== undefined;
			return createText(
				String(dxfEntity.string ?? ''),
				new Point(
					useAlignmentPoint ? number('x2') : number('x'),
					useAlignmentPoint ? number('y2') : number('y')
				),
				number('textHeight'),
				(number('rotation') * Math.PI) / 180,
				TEXT_ALIGNMENTS[hAlign] ?? 'left'
			);
		}
		case 'MTEXT': {
			const attachmentPoint = number('attachmentPoint') || 1;
			const rotation =
				dxfEntity.xAxisX !== undefined ? Math.atan2(number('xAxisY'), number('xAxisX')) : 0;
			return createText(
				stripMTextFormatting(String(dxfEntity.string ?? '')),
				new Point(number('x'), number('y')),
				number('nominalTextHeight'),
				rotation,
				TEXT_ALIGNMENTS[(attachmentPoint - 1) % 3]
			);
		}
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
		const newLayer: Layer = {
			...getNewLayer(layers),
			name: layerName,
			color: aciToHex(dxfLibrary.colors, Math.abs(layerTable?.colorNumber ?? 0)) ?? undefined,
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
		if (unsupportedTypes.length) {
			toast.info(`Skipped unsupported DXF entities: ${unsupportedTypes.join(', ')}`);
		}
	} catch (error) {
		console.error('Error parsing DXF file:', error);
		toast.error('An error occurred while reading the DXF file. See console for details.');
	}
};
