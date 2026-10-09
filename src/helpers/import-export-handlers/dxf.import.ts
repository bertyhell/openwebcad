import { Point, Vector } from '@flatten-js/core';
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
 * Loosely typed dxf entity, the typings of the dxf library don't cover every property it returns
 */
interface DxfEntity {
	type: string;
	layer?: string;
	colorNumber?: number;
	visible?: boolean;
	paperSpace?: number;
	[key: string]: unknown;
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
		const entity = convertEntity(dxfEntity);
		if (!entity) {
			unsupportedTypes.add(dxfEntity.type);
			continue;
		}
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
