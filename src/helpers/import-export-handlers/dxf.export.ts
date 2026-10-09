import type { Arc, Circle, Point, Polygon, Segment } from '@flatten-js/core';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import type { Layer } from '../../App.types.ts';
import { type Entity, EntityName } from '../../entities/Entity.ts';
import type { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
import type { TextEntity } from '../../entities/TextEntity.ts';
import { getLayers, getVisibleEntities } from '../../state.ts';
import { chainSegments } from '../order-edge-boundary.ts';
import { fromHex } from '../rgb-to-hex-color.ts';

const TO_DEGREES = 180 / Math.PI;
const WHITE_COLOR = 7;

/**
 * Group code and value pairs of a dxf file
 */
type DxfPairs = (string | number)[];

/**
 * Closest AutoCAD color index for a css color
 * Dxf R12 only supports the 255 indexed colors, white and black both map to color 7
 */
export function hexToAci(color: string, aciColors: number[][]): number {
	const [red, green, blue] = fromHex(color);
	if ((red > 240 && green > 240 && blue > 240) || (red < 15 && green < 15 && blue < 15)) {
		return WHITE_COLOR;
	}
	let closestIndex = WHITE_COLOR;
	let closestDistance = Number.POSITIVE_INFINITY;
	for (let index = 1; index < Math.min(256, aciColors.length); index++) {
		const [aciRed, aciGreen, aciBlue] = aciColors[index];
		const distance = (red - aciRed) ** 2 + (green - aciGreen) ** 2 + (blue - aciBlue) ** 2;
		if (distance < closestDistance) {
			closestDistance = distance;
			closestIndex = index;
		}
	}
	return closestIndex;
}

/**
 * Formats numbers without exponents, which some dxf readers don't support
 */
function formatNumber(value: number): string {
	const rounded = Math.round(value * 1e9) / 1e9;
	return Object.is(rounded, -0) ? '0' : String(rounded);
}

function pointPairs(point: Point, xCode = 10): DxfPairs {
	return [xCode, formatNumber(point.x), xCode + 10, formatNumber(point.y), xCode + 20, 0];
}

interface PolylineVertex {
	point: Point;
	bulge: number;
}

/**
 * Bulge of an arc segment in a polyline: the tangent of a quarter of the arc angle,
 * positive when the arc turns counterclockwise in the direction the polyline is walked
 */
function getBulge(arc: Arc, isReversed: boolean): number {
	const bulge = Math.tan(arc.sweep / 4) * (arc.counterClockwise ? 1 : -1);
	return isReversed ? -bulge : bulge;
}

function getPolyLineVertices(polyLine: PolyLineEntity): {
	vertices: PolylineVertex[];
	closed: boolean;
} {
	const vertices: PolylineVertex[] = [];
	let currentPoint: Point | null = null;
	for (const segment of chainSegments(polyLine.entities)) {
		const start = segment.getStartPoint();
		const end = segment.getEndPoint();
		// Segments can be stored in the opposite direction of the polyline
		const isReversed: boolean =
			!!currentPoint && !currentPoint.equalTo(start) && currentPoint.equalTo(end);
		const segmentStart = isReversed ? end : start;
		const segmentEnd: Point = isReversed ? start : end;
		const bulge =
			segment.getType() === EntityName.Arc ? getBulge(segment.getShape() as Arc, isReversed) : 0;
		vertices.push({ point: segmentStart, bulge });
		currentPoint = segmentEnd;
	}
	const firstPoint = vertices[0]?.point;
	const closed = !!currentPoint && !!firstPoint && currentPoint.equalTo(firstPoint);
	if (!closed && currentPoint) {
		vertices.push({ point: currentPoint, bulge: 0 });
	}
	return { vertices, closed };
}

/**
 * R12 polylines are a POLYLINE entity followed by VERTEX entities and a SEQEND
 */
function polylinePairs(
	vertices: PolylineVertex[],
	closed: boolean,
	commonPairs: DxfPairs
): DxfPairs {
	return [
		0,
		'POLYLINE',
		...commonPairs,
		66,
		1,
		10,
		0,
		20,
		0,
		30,
		0,
		70,
		closed ? 1 : 0,
		...vertices.flatMap((vertex) => [
			0,
			'VERTEX',
			...commonPairs,
			...pointPairs(vertex.point),
			...(vertex.bulge ? [42, formatNumber(vertex.bulge)] : []),
		]),
		0,
		'SEQEND',
		...commonPairs,
	];
}

function entityPairs(entity: Entity, commonPairs: DxfPairs): DxfPairs | null {
	switch (entity.getType()) {
		case EntityName.Line: {
			const segment = entity.getShape() as Segment;
			return [
				0,
				'LINE',
				...commonPairs,
				...pointPairs(segment.start),
				...pointPairs(segment.end, 11),
			];
		}
		case EntityName.Circle: {
			const circle = entity.getShape() as Circle;
			return [
				0,
				'CIRCLE',
				...commonPairs,
				...pointPairs(circle.center),
				40,
				formatNumber(circle.r.valueOf()),
			];
		}
		case EntityName.Arc: {
			const arc = entity.getShape() as Arc;
			// Dxf arcs always go counterclockwise, so a clockwise arc goes from its end to its start
			const startAngle = arc.counterClockwise ? arc.startAngle : arc.endAngle;
			const endAngle = arc.counterClockwise ? arc.endAngle : arc.startAngle;
			return [
				0,
				'ARC',
				...commonPairs,
				...pointPairs(arc.center),
				40,
				formatNumber(arc.r.valueOf()),
				50,
				formatNumber(startAngle * TO_DEGREES),
				51,
				formatNumber(endAngle * TO_DEGREES),
			];
		}
		case EntityName.Rectangle:
		case EntityName.Image: {
			// Images are exported as their outline
			const polygon = entity.getShape() as Polygon;
			return polylinePairs(
				polygon.vertices.map((point) => ({ point, bulge: 0 })),
				true,
				commonPairs
			);
		}
		case EntityName.PolyLine: {
			const { vertices, closed } = getPolyLineVertices(entity as PolyLineEntity);
			return vertices.length >= 2 ? polylinePairs(vertices, closed, commonPairs) : null;
		}
		case EntityName.Text: {
			const text = entity as TextEntity;
			const options = text.getOptions();
			const horizontalAlignment = { left: 0, center: 1, right: 2 }[options.textAlign];
			return [
				0,
				'TEXT',
				...commonPairs,
				...pointPairs(text.getBasePoint()),
				40,
				formatNumber(text.getFontSize()),
				1,
				text.getLabel(),
				50,
				formatNumber(Math.atan2(options.textDirection.y, options.textDirection.x) * TO_DEGREES),
				72,
				horizontalAlignment,
				// The text is vertically centered on its base point
				...pointPairs(text.getBasePoint(), 11),
				73,
				2,
			];
		}
		default:
			return null;
	}
}

/**
 * R12 layer names may only contain letters, digits, $, - and _
 */
export function toDxfLayerName(name: string): string {
	return name.trim().replace(/[^A-Za-z0-9$_-]/g, '_') || '0';
}

/**
 * Valid and unique dxf layer names, layers whose names become the same get a number appended
 */
function getDxfLayerNames(layers: Layer[]): Map<string, string> {
	const usedNames = new Set<string>();
	const nameById = new Map<string, string>();
	for (const layer of layers) {
		const baseName = toDxfLayerName(layer.name);
		let name = baseName;
		for (let suffix = 2; usedNames.has(name.toUpperCase()); suffix++) {
			name = `${baseName}_${suffix}`;
		}
		usedNames.add(name.toUpperCase());
		nameById.set(layer.id, name);
	}
	return nameById;
}

export interface DxfExportResult {
	dxf: string;
	skippedTypes: string[];
}

/**
 * Converts the entities and layers into an ascii dxf file (AutoCAD R12)
 * R12 is the simplest dxf version and can be opened by most CAD applications
 */
export function convertEntitiesToDxf(
	entities: Entity[],
	layers: Layer[],
	aciColors: number[][]
): DxfExportResult {
	const layerNameById = getDxfLayerNames(layers);
	const skippedTypes = new Set<string>();

	// The layers refer to the CONTINUOUS line type, so it has to be defined
	const lineTypeTable: DxfPairs = [
		0,
		'TABLE',
		2,
		'LTYPE',
		70,
		1,
		0,
		'LTYPE',
		2,
		'CONTINUOUS',
		70,
		0,
		3,
		'Solid line',
		72,
		65,
		73,
		0,
		40,
		0,
		0,
		'ENDTAB',
	];

	const layerTable: DxfPairs = [
		0,
		'TABLE',
		2,
		'LAYER',
		70,
		layers.length,
		...layers.flatMap((layer) => [
			0,
			'LAYER',
			2,
			layerNameById.get(layer.id) ?? '0',
			70,
			layer.isLocked ? 4 : 0,
			// A negative color hides the layer
			62,
			(layer.isVisible ? 1 : -1) * hexToAci(layer.color ?? '#ffffff', aciColors),
			6,
			'CONTINUOUS',
		]),
		0,
		'ENDTAB',
	];

	const entityPairsList: DxfPairs = entities.flatMap((entity) => {
		const commonPairs: DxfPairs = [
			8,
			layerNameById.get(entity.layerId) ?? '0',
			62,
			hexToAci(entity.lineColor, aciColors),
		];
		const pairs = entityPairs(entity, commonPairs);
		if (!pairs) {
			skippedTypes.add(entity.getType());
			return [];
		}
		return pairs;
	});

	const pairs: DxfPairs = [
		0,
		'SECTION',
		2,
		'HEADER',
		9,
		'$ACADVER',
		1,
		'AC1009',
		0,
		'ENDSEC',
		0,
		'SECTION',
		2,
		'TABLES',
		...lineTypeTable,
		...layerTable,
		0,
		'ENDSEC',
		0,
		'SECTION',
		2,
		'ENTITIES',
		...entityPairsList,
		0,
		'ENDSEC',
		0,
		'EOF',
	];

	const lines: string[] = [];
	for (let index = 0; index < pairs.length; index += 2) {
		lines.push(String(pairs[index]), String(pairs[index + 1]));
	}
	return { dxf: `${lines.join('\n')}\n`, skippedTypes: [...skippedTypes] };
}

/**
 * Saves the visible entities of the drawing as a dxf file
 */
export async function exportEntitiesToDxfFile(): Promise<void> {
	const { colors } = await import('dxf');
	const { dxf, skippedTypes } = convertEntitiesToDxf(
		getVisibleEntities(),
		getLayers(),
		colors as unknown as number[][]
	);
	saveAs(new Blob([dxf], { type: 'application/dxf' }), 'open-web-cad--drawing.dxf');
	if (skippedTypes.length) {
		toast.info(
			`These entities are not supported in DXF and were skipped: ${skippedTypes.join(', ')}`
		);
	}
}
