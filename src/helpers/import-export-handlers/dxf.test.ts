import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Arc, type Circle, Point, type Segment } from '@flatten-js/core';
import * as dxfLibrary from 'dxf';
import { saveAs } from 'file-saver';
import { describe, expect, it, vi } from 'vitest';
import { MEASUREMENT_FONT_SIZE } from '../../App.consts.ts';
import type { Layer } from '../../App.types.ts';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import type { EllipseEntity } from '../../entities/EllipseEntity.ts';
import { type Entity, EntityName } from '../../entities/Entity.ts';
import { FillEntity } from '../../entities/FillEntity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { MeasurementEntity } from '../../entities/MeasurementEntity.ts';
import { PointEntity } from '../../entities/PointEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
import type { SplineEntity } from '../../entities/SplineEntity.ts';
import { TextEntity } from '../../entities/TextEntity.ts';
import { createTestLayer, resetState } from '../../test-helpers/reset-state.ts';
import { convertEntitiesToDxf, exportEntitiesToDxfFile, hexToAci } from './dxf.export.ts';
import {
	convertDxfToEntities,
	createArcFromBulge,
	type DxfLibrary,
	stripMTextFormatting,
} from './dxf.import.ts';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

const library = dxfLibrary as unknown as DxfLibrary;
const aciColors = dxfLibrary.colors as unknown as number[][];

function readMock(fileName: string): string {
	return readFileSync(resolve(__dirname, '../../../test/mocks/dxf', fileName), 'utf-8');
}

describe('dxf import', () => {
	it('imports lines and circles, including coordinates of 0', () => {
		const { entities, newLayers } = convertDxfToEntities(
			readMock('line-and-circle.dxf'),
			library,
			[]
		);
		expect(entities.map((entity) => entity.getType())).toEqual([
			EntityName.Line,
			EntityName.Circle,
		]);
		const segment = entities[0].getShape() as Segment;
		expect(segment.start.equalTo(new Point(10, 10))).toBe(true);
		expect(segment.end.equalTo(new Point(20, 20))).toBe(true);
		expect((entities[1].getShape() as Circle).r.valueOf()).toBe(5);
		// Dxf layer 0 becomes a layer in the drawing
		expect(newLayers.map((layer) => layer.name)).toEqual(['0']);
		expect(entities[0].layerId).toBe(newLayers[0].id);
	});

	it('reuses existing layers with the same name', () => {
		const existingLayer = createTestLayer('existing', { name: '0' });
		const { entities, newLayers } = convertDxfToEntities(readMock('line.dxf'), library, [
			existingLayer,
		]);
		expect(newLayers).toEqual([]);
		expect(entities[0].layerId).toBe('existing');
	});

	it('handles empty and unsupported files', () => {
		expect(convertDxfToEntities(readMock('empty.dxf'), library, []).entities).toEqual([]);
	});

	it('converts a polyline bulge into an arc', () => {
		const arc = createArcFromBulge(new Point(1, 0), new Point(-1, 0), 1).getShape() as Arc;
		expect(arc.center.x).toBeCloseTo(0);
		expect(arc.center.y).toBeCloseTo(0);
		expect(arc.r.valueOf()).toBeCloseTo(1);
		expect(arc.counterClockwise).toBe(true);
		expect(arc.contains(new Point(0, 1))).toBe(true);
	});

	it('strips mtext formatting', () => {
		expect(stripMTextFormatting('{\\fArial|b1;Hello}\\PWorld')).toBe('Hello World');
	});
});

/**
 * Builds a dxf file from the group code and value pairs of its blocks and entities
 */
function createDxf(
	entities: (string | number)[],
	blocks: (string | number)[] = [],
	layers: (string | number)[] = []
): string {
	const pairs = [
		...(layers.length
			? [0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', ...layers, 0, 'ENDTAB', 0, 'ENDSEC']
			: []),
		...(blocks.length ? [0, 'SECTION', 2, 'BLOCKS', ...blocks, 0, 'ENDSEC'] : []),
		0,
		'SECTION',
		2,
		'ENTITIES',
		...entities,
		0,
		'ENDSEC',
		0,
		'EOF',
	];
	return `${pairs.join('\n')}\n`;
}

function expectPoint(point: Point, x: number, y: number) {
	expect(point.x).toBeCloseTo(x);
	expect(point.y).toBeCloseTo(y);
}

describe('dxf import of blocks', () => {
	// Block with its base point at 5,5 and a horizontal line from the base point
	const lineBlock = [
		0,
		'BLOCK',
		2,
		'tick',
		10,
		5,
		20,
		5,
		0,
		'LINE',
		8,
		'0',
		10,
		5,
		20,
		5,
		11,
		15,
		21,
		5,
		0,
		'ENDBLK',
	];

	it('moves, rotates and scales every insert of a block', () => {
		const dxf = createDxf(
			[
				...[0, 'INSERT', 8, '0', 2, 'tick', 10, 100, 20, 100, 41, 2, 42, 2, 50, 90],
				...[0, 'INSERT', 8, '0', 2, 'tick', 10, 200, 20, 0],
			],
			lineBlock
		);
		const { entities } = convertDxfToEntities(dxf, library, []);
		expect(entities).toHaveLength(2);
		const [rotated, moved] = entities as LineEntity[];
		expectPoint(rotated.getStartPoint(), 100, 100);
		expectPoint(rotated.getEndPoint(), 100, 120);
		expectPoint(moved.getStartPoint(), 200, 0);
		expectPoint(moved.getEndPoint(), 210, 0);
	});

	it('applies the transformation of nested blocks and their base points', () => {
		const dxf = createDxf(
			[0, 'INSERT', 8, '0', 2, 'outer', 10, 100, 20, 0, 50, 90],
			[
				...lineBlock,
				// The tick is inserted at 15,5 in a block with its base point at 10,5, so 5,0 from the base point
				...[0, 'BLOCK', 2, 'outer', 10, 10, 20, 5],
				...[0, 'INSERT', 8, '0', 2, 'tick', 10, 15, 20, 5],
				...[0, 'POINT', 8, '0', 10, 10, 20, 7],
				...[0, 'TEXT', 8, '0', 10, 10, 20, 5, 40, 1, 1, 'A', 72, 0, 73, 2],
				...[0, 'ENDBLK'],
			]
		);
		const { entities } = convertDxfToEntities(dxf, library, []);
		const line = entities.find((entity) => entity instanceof LineEntity) as LineEntity;
		expectPoint(line.getStartPoint(), 100, 5);
		expectPoint(line.getEndPoint(), 100, 15);
		const point = entities.find((entity) => entity instanceof PointEntity) as PointEntity;
		expectPoint(point.point, 98, 0);
		const text = entities.find((entity) => entity instanceof TextEntity) as TextEntity;
		expectPoint(text.getBasePoint(), 100, 0);
	});

	it('places polylines in nested, rotated, scaled and mirrored blocks like the dxf library does', () => {
		const dxf = createDxf(
			[0, 'INSERT', 8, '0', 2, 'holder', 10, 50, 20, 50, 41, 2, 42, -1, 50, -45],
			[
				...[0, 'BLOCK', 2, 'zigzag', 10, 2, 20, 1],
				...[0, 'LWPOLYLINE', 8, '0', 90, 4, 70, 0],
				...[10, 2, 20, 1, 10, 5, 20, 1, 10, 5, 20, 4, 10, 8, 20, 4],
				...[0, 'ENDBLK'],
				...[0, 'BLOCK', 2, 'holder', 10, 0, 20, 0],
				...[0, 'INSERT', 8, '0', 2, 'zigzag', 10, 10, 20, 0, 41, 1.5, 42, 0.5, 50, 30],
				...[0, 'ENDBLK'],
			]
		);
		const { entities } = convertDxfToEntities(dxf, library, []);
		const parsed = new dxfLibrary.Helper(dxf).parsed as NonNullable<dxfLibrary.Helper['parsed']>;
		const expectedVertices = dxfLibrary.toPolylines(parsed).polylines[0].vertices;
		const lines = (entities[0] as PolyLineEntity).entities;
		expect(lines).toHaveLength(3);
		lines.forEach((line, index) => {
			expectPoint(line.getStartPoint(), expectedVertices[index][0], expectedVertices[index][1]);
			expectPoint(
				line.getEndPoint(),
				expectedVertices[index + 1][0],
				expectedVertices[index + 1][1]
			);
		});
	});

	it('turns circles and arcs into ellipses and splines when a block is scaled differently along x and y', () => {
		const dxf = createDxf(
			[0, 'INSERT', 8, '0', 2, 'round', 10, 10, 20, 0, 41, 2, 42, 1],
			[
				...[0, 'BLOCK', 2, 'round', 10, 0, 20, 0],
				...[0, 'CIRCLE', 8, '0', 10, 0, 20, 0, 40, 1],
				...[0, 'ARC', 8, '0', 10, 0, 20, 0, 40, 1, 50, 0, 51, 90],
				...[0, 'ENDBLK'],
			]
		);
		const { entities } = convertDxfToEntities(dxf, library, []);
		expect(entities.map((entity) => entity.getType())).toEqual([
			EntityName.Ellipse,
			EntityName.Spline,
		]);
		const ellipse = entities[0] as EllipseEntity;
		expectPoint(ellipse.getCenter(), 10, 0);
		expect(Math.abs(ellipse.getMajorAxisEnd().x - 10)).toBeCloseTo(2);
		expect(ellipse.getRatio()).toBeCloseTo(0.5);
		const fitPoints = (entities[1] as SplineEntity).getFitPoints();
		expectPoint(fitPoints[0], 12, 0);
		expectPoint(fitPoints[fitPoints.length - 1], 10, 1);
		for (const point of fitPoints) {
			expect(((point.x - 10) / 2) ** 2 + point.y ** 2).toBeCloseTo(1);
		}
	});

	it('mirrors blocks with a negative scale, and keeps their texts readable', () => {
		const dxf = createDxf(
			[0, 'INSERT', 8, '0', 2, 'door', 10, 0, 20, 0, 41, -1, 42, 1],
			[
				...[0, 'BLOCK', 2, 'door', 10, 0, 20, 0],
				...[0, 'ARC', 8, '0', 10, 10, 20, 0, 40, 5, 50, 0, 51, 90],
				...[0, 'TEXT', 8, '0', 10, 10, 20, 0, 40, 1, 1, 'Door', 72, 0, 73, 2, 11, 10, 21, 0],
				...[0, 'ENDBLK'],
			]
		);
		const { entities } = convertDxfToEntities(dxf, library, []);
		const arc = entities[0].getShape() as Arc;
		expectPoint(arc.center, -10, 0);
		expect(arc.r.valueOf()).toBeCloseTo(5);
		expect(arc.length).toBeCloseTo((Math.PI / 2) * 5);
		expect(arc.contains(new Point(-10 - 5 * Math.SQRT1_2, 5 * Math.SQRT1_2))).toBe(true);
		// The text ends where the mirrored text starts, and reads from left to right
		const text = entities[1] as TextEntity;
		expectPoint(text.getBasePoint(), -10, 0);
		expect(text.getOptions().textAlign).toBe('right');
		expectPoint(
			new Point(text.getOptions().textDirection.x, text.getOptions().textDirection.y),
			1,
			0
		);
	});
});

describe('dxf import of mirrored entities', () => {
	// Entities that are mirrored in AutoCAD get an extrusion direction pointing down, their coordinates are mirrored over the y axis
	const downwardExtrusion = [210, 0, 220, 0, 230, -1];

	it('mirrors arcs and circles with a downward extrusion direction', () => {
		const dxf = createDxf([
			...[0, 'ARC', 8, '0', 10, 10, 20, 0, 40, 5, 50, 0, 51, 90, ...downwardExtrusion],
			...[0, 'CIRCLE', 8, '0', 10, 10, 20, 3, 40, 2, ...downwardExtrusion],
		]);
		const { entities } = convertDxfToEntities(dxf, library, []);
		const arc = entities[0].getShape() as Arc;
		expectPoint(arc.center, -10, 0);
		expect(arc.length).toBeCloseTo((Math.PI / 2) * 5);
		expect(arc.contains(new Point(-10 - 5 * Math.SQRT1_2, 5 * Math.SQRT1_2))).toBe(true);
		expectPoint((entities[1].getShape() as Circle).center, -10, 3);
	});

	it('mirrors polylines and their bulges with a downward extrusion direction', () => {
		const dxf = createDxf([
			...[0, 'LWPOLYLINE', 8, '0', 90, 2, 70, 0],
			...[10, 1, 20, 0, 42, 1, 10, 3, 20, 0],
			...downwardExtrusion,
		]);
		const { entities } = convertDxfToEntities(dxf, library, []);
		const arc = entities[0].getShape() as Arc;
		expectPoint(arc.center, -2, 0);
		// The bulge turns counterclockwise from 1,0 to 3,0 through 2,-1, mirrored it goes through -2,-1
		expect(arc.contains(new Point(-2, -1))).toBe(true);
		expect(arc.contains(new Point(-2, 1))).toBe(false);
	});
});

describe('dxf import of points, ellipses, splines and solids', () => {
	it('imports points', () => {
		const { entities, unsupportedTypes } = convertDxfToEntities(
			createDxf([0, 'POINT', 8, '0', 10, 3, 20, 4]),
			library,
			[]
		);
		expect(unsupportedTypes).toEqual([]);
		expectPoint((entities[0] as PointEntity).point, 3, 4);
	});

	it('imports full ellipses as ellipses', () => {
		const dxf = createDxf([
			...[0, 'ELLIPSE', 8, '0', 10, 1, 20, 2, 11, 10, 21, 0, 40, 0.5],
			...[41, 0, 42, 2 * Math.PI],
		]);
		const ellipse = convertDxfToEntities(dxf, library, []).entities[0] as EllipseEntity;
		expect(ellipse.getType()).toBe(EntityName.Ellipse);
		expectPoint(ellipse.getCenter(), 1, 2);
		expectPoint(ellipse.getMajorAxisEnd(), 11, 2);
		expect(ellipse.getRatio()).toBe(0.5);
	});

	it('imports partial ellipses as splines, on the side given by the extrusion direction', () => {
		const halfEllipse = [
			0,
			'ELLIPSE',
			8,
			'0',
			10,
			0,
			20,
			0,
			11,
			10,
			21,
			0,
			40,
			0.5,
			41,
			0,
			42,
			Math.PI,
		];
		const { entities } = convertDxfToEntities(
			createDxf([...halfEllipse, ...halfEllipse, 210, 0, 220, 0, 230, -1]),
			library,
			[]
		);
		const [upperHalf, lowerHalf] = entities.map((entity) =>
			(entity as SplineEntity).getFitPoints()
		);
		expectPoint(upperHalf[0], 10, 0);
		expectPoint(upperHalf[upperHalf.length - 1], -10, 0);
		for (const point of [...upperHalf, ...lowerHalf]) {
			expect((point.x / 10) ** 2 + (point.y / 5) ** 2).toBeCloseTo(1);
		}
		expect(upperHalf.every((point) => point.y >= -1e-9)).toBe(true);
		expect(lowerHalf.every((point) => point.y <= 1e-9)).toBe(true);
	});

	it('imports splines by following their control points', () => {
		const dxf = createDxf([
			...[0, 'SPLINE', 8, '0', 70, 8, 71, 3, 72, 8, 73, 4],
			...[40, 0, 40, 0, 40, 0, 40, 0, 40, 1, 40, 1, 40, 1, 40, 1],
			...[10, 0, 20, 0, 10, 1, 20, 1, 10, 2, 20, 1, 10, 3, 20, 0],
		]);
		const fitPoints = (
			convertDxfToEntities(dxf, library, []).entities[0] as SplineEntity
		).getFitPoints();
		expectPoint(fitPoints[0], 0, 0);
		expectPoint(fitPoints[fitPoints.length - 1], 3, 0);
		// A cubic spline with 4 control points is a bezier curve, which is at 1.5,0.75 halfway
		expect(fitPoints.some((point) => point.distanceTo(new Point(1.5, 0.75))[0] < 1e-9)).toBe(true);
	});

	it('imports rational splines using their weights', () => {
		// Quarter of a circle with radius 1 as a rational quadratic spline
		const dxf = createDxf([
			...[0, 'SPLINE', 8, '0', 70, 12, 71, 2, 72, 6, 73, 3],
			...[40, 0, 40, 0, 40, 0, 40, 1, 40, 1, 40, 1],
			...[10, 1, 20, 0, 41, 1, 10, 1, 20, 1, 41, Math.SQRT1_2, 10, 0, 20, 1, 41, 1],
		]);
		const fitPoints = (
			convertDxfToEntities(dxf, library, []).entities[0] as SplineEntity
		).getFitPoints();
		expect(fitPoints.length).toBeGreaterThan(2);
		for (const point of fitPoints) {
			expect(Math.hypot(point.x, point.y)).toBeCloseTo(1);
		}
	});

	it('imports splines of degree 1 as straight lines', () => {
		const dxf = createDxf([
			...[0, 'SPLINE', 8, '0', 70, 8, 71, 1, 72, 5, 73, 3],
			...[40, 0, 40, 0, 40, 1, 40, 2, 40, 2],
			...[10, 0, 20, 0, 10, 1, 20, 1, 10, 2, 20, 0],
		]);
		const polyLine = convertDxfToEntities(dxf, library, []).entities[0] as PolyLineEntity;
		expect(polyLine.entities.map((segment) => segment.getType())).toEqual([
			EntityName.Line,
			EntityName.Line,
		]);
	});

	it('imports solids as fills, with their third and fourth corner swapped', () => {
		const dxf = createDxf([
			...[0, 'SOLID', 8, '0', 62, 1, 10, 0, 20, 0, 11, 1, 21, 0, 12, 0, 22, 1, 13, 1, 23, 1],
			// A triangle repeats its third corner
			...[0, 'SOLID', 8, '0', 10, 5, 20, 0, 11, 6, 21, 0, 12, 5, 22, 1, 13, 5, 23, 1],
		]);
		const { entities, unsupportedTypes } = convertDxfToEntities(dxf, library, []);
		expect(unsupportedTypes).toEqual([]);
		const [square, triangle] = entities as FillEntity[];
		expect(square).toBeInstanceOf(FillEntity);
		expect(square.fillColor).toBe('#ff0000');
		const squareEdges = square.getEdges() as Segment[];
		expect(squareEdges).toHaveLength(4);
		// The outline goes around the square instead of crossing it
		expect(squareEdges.every((edge) => edge.length === 1)).toBe(true);
		expect(triangle.getEdges()).toHaveLength(3);
	});
});

describe('dxf import of texts', () => {
	// TextEntity draws its text vertically centered on its base point, the text height is 2 in these tests
	function importText(alignmentPairs: (string | number)[]): TextEntity {
		const dxf = createDxf([0, 'TEXT', 8, '0', 40, 2, 1, 'Label', ...alignmentPairs]);
		return convertDxfToEntities(dxf, library, []).entities[0] as TextEntity;
	}

	function expectText(
		text: TextEntity,
		basePoint: [number, number],
		textAlign: 'left' | 'center' | 'right',
		direction: [number, number] = [1, 0]
	) {
		expectPoint(text.getBasePoint(), ...basePoint);
		expect(text.getOptions().textAlign).toBe(textAlign);
		expectPoint(
			new Point(text.getOptions().textDirection.x, text.getOptions().textDirection.y),
			...direction
		);
	}

	it('places left aligned texts above their baseline', () => {
		expectText(importText([10, 3, 20, 4]), [3, 5], 'left');
	});

	it('places rotated texts next to their baseline', () => {
		expectText(importText([10, 0, 20, 0, 50, 90]), [-1, 0], 'left', [0, 1]);
	});

	it('uses the alignment point for centered, right aligned and vertically aligned texts', () => {
		expectText(importText([10, 0, 20, 0, 11, 10, 21, 0, 72, 1]), [10, 1], 'center');
		expectText(importText([10, 0, 20, 0, 11, 10, 21, 0, 72, 2, 73, 3]), [10, -1], 'right');
		expectText(importText([10, 0, 20, 0, 11, 10, 21, 0, 72, 0, 73, 2]), [10, 0], 'left');
	});

	it('centers aligned and fit texts between their two points', () => {
		expectText(importText([10, 0, 20, 0, 11, 10, 21, 0, 72, 3]), [5, 1], 'center');
		expectText(importText([10, 0, 20, 0, 11, 0, 21, 10, 72, 5]), [-1, 5], 'center', [0, 1]);
	});

	it('centers middle aligned texts on their alignment point', () => {
		expectText(importText([10, 0, 20, 0, 11, 20, 21, 20, 72, 4]), [20, 20], 'center');
	});

	it('aligns mtexts vertically to their attachment point', () => {
		const importMText = (attachmentPoint: number) =>
			convertDxfToEntities(
				createDxf([0, 'MTEXT', 8, '0', 10, 0, 20, 10, 40, 2, 71, attachmentPoint, 1, 'Label']),
				library,
				[]
			).entities[0] as TextEntity;
		expectText(importMText(1), [0, 9], 'left');
		expectText(importMText(5), [0, 10], 'center');
		expectText(importMText(9), [0, 11], 'right');
	});

	it('keeps the place of left, centered and right aligned texts when exporting and importing them', () => {
		const layer = createTestLayer('layer');
		const texts = (['left', 'center', 'right'] as const).map((textAlign, index) => {
			const text = new TextEntity('Label', new Point(index * 10, 5), { fontSize: 2, textAlign });
			text.layerId = layer.id;
			return text;
		});
		const { dxf } = convertEntitiesToDxf(texts, [layer], aciColors);
		const importedTexts = convertDxfToEntities(dxf, library, []).entities as TextEntity[];
		expectText(importedTexts[0], [0, 5], 'left');
		expectText(importedTexts[1], [10, 5], 'center');
		expectText(importedTexts[2], [20, 5], 'right');
	});
});

describe('dxf import of layers', () => {
	it('hides layers that are off or frozen, and locks locked layers', () => {
		const layer = (name: string, flags: number, color: number) => [
			0,
			'LAYER',
			2,
			name,
			70,
			flags,
			62,
			color,
		];
		const line = (layerName: string) => [0, 'LINE', 8, layerName, 10, 0, 20, 0, 11, 1, 21, 1];
		const dxf = createDxf(
			[...line('normal'), ...line('off'), ...line('frozen'), ...line('locked')],
			[],
			[
				...layer('normal', 0, 5),
				...layer('off', 0, -1),
				...layer('frozen', 1, 3),
				...layer('locked', 4, 3),
			]
		);
		const { entities, newLayers } = convertDxfToEntities(dxf, library, []);
		expect(
			newLayers.map(({ name, isVisible, isLocked }) => ({ name, isVisible, isLocked }))
		).toEqual([
			{ name: 'normal', isVisible: true, isLocked: false },
			{ name: 'off', isVisible: false, isLocked: false },
			{ name: 'frozen', isVisible: false, isLocked: false },
			{ name: 'locked', isVisible: true, isLocked: true },
		]);
		// A layer that is off keeps its color
		expect(newLayers[1].color).toBe('#ff0000');
		expect(entities[1].lineColor).toBe('#ff0000');
	});
});

describe('dxf export', () => {
	it('maps colors to the closest dxf color index', () => {
		expect(hexToAci('#ffffff', aciColors)).toBe(7);
		expect(hexToAci('#ff0000', aciColors)).toBe(1);
		expect(hexToAci('#0000ff', aciColors)).toBe(5);
	});

	it('round trips entities, layers and colors', () => {
		const layers = [
			createTestLayer('walls', { name: 'Walls' }),
			createTestLayer('notes', { name: 'Notes' }),
		];
		const line = new LineEntity(new Point(0, 0), new Point(100, 50));
		line.layerId = 'walls';
		line.lineColor = '#ff0000';
		const circle = new CircleEntity(new Point(-20, 30), 15);
		circle.layerId = 'walls';
		const clockwiseArc = new ArcEntity(new Point(0, 0), 10, Math.PI / 2, 0, false);
		clockwiseArc.layerId = 'walls';
		const polyLine = new PolyLineEntity([
			new LineEntity(new Point(0, 0), new Point(10, 0)),
			new ArcEntity(new Point(10, 5), 5, -Math.PI / 2, Math.PI / 2, true),
			new LineEntity(new Point(10, 10), new Point(0, 10)),
			new LineEntity(new Point(0, 10), new Point(0, 0)),
		]);
		polyLine.layerId = 'walls';
		const text = new TextEntity('Kitchen', new Point(5, 5), { fontSize: 12, textAlign: 'left' });
		text.layerId = 'notes';

		const { dxf, skippedTypes } = convertEntitiesToDxf(
			[line, circle, clockwiseArc, polyLine, text],
			layers,
			aciColors
		);
		expect(skippedTypes).toEqual([]);

		const { entities, newLayers } = convertDxfToEntities(dxf, library, []);
		expect(newLayers.map((layer) => layer.name)).toEqual(['Walls', 'Notes']);
		expect(entities.map((entity) => entity.getType())).toEqual([
			EntityName.Line,
			EntityName.Circle,
			EntityName.Arc,
			EntityName.PolyLine,
			EntityName.Text,
		]);

		const [importedLine, importedCircle, importedArc, importedPolyLine, importedText] = entities;
		expect(importedLine.lineColor).toBe('#ff0000');
		expect((importedLine.getShape() as Segment).end.equalTo(new Point(100, 50))).toBe(true);
		expect((importedCircle.getShape() as Circle).center.equalTo(new Point(-20, 30))).toBe(true);

		// The clockwise arc from 90° to 0° is the same arc as the counterclockwise arc from 0° to 90°
		const arcShape = importedArc.getShape() as Arc;
		expect(arcShape.contains(new Point(Math.SQRT1_2 * 10, Math.SQRT1_2 * 10))).toBe(true);
		expect(arcShape.length).toBeCloseTo((Math.PI / 2) * 10);

		const importedSegments = (importedPolyLine as PolyLineEntity).entities;
		expect(importedSegments.map((segment) => segment.getType())).toEqual([
			EntityName.Line,
			EntityName.Arc,
			EntityName.Line,
			EntityName.Line,
		]);
		expect((importedSegments[1].getShape() as Arc).contains(new Point(15, 5))).toBe(true);

		expect((importedText as TextEntity).getLabel()).toBe('Kitchen');
		expect((importedText as TextEntity).getFontSize()).toBe(12);
		expect(importedText.layerId).toBe(newLayers[1].id);
	});
});

describe('dxf export of points, dimensions and fills', () => {
	const layer = createTestLayer('layer', { name: 'Layer 1' });

	function exportAndImport(entities: Entity[]) {
		for (const entity of entities) {
			entity.layerId = layer.id;
		}
		const { dxf, skippedTypes } = convertEntitiesToDxf(entities, [layer], aciColors);
		return { skippedTypes, ...convertDxfToEntities(dxf, library, []) };
	}

	it('exports points', () => {
		const { skippedTypes, entities } = exportAndImport([new PointEntity(3, 4)]);
		expect(skippedTypes).toEqual([]);
		expectPoint((entities[0] as PointEntity).point, 3, 4);
	});

	it('exports dimensions as their lines and their label', () => {
		const measurement = new MeasurementEntity(
			new Point(0, 0),
			new Point(100, 0),
			new Point(50, 50)
		);
		const { skippedTypes, entities } = exportAndImport([measurement]);
		expect(skippedTypes).toEqual([]);
		const drawPoints = measurement.getDrawPoints();
		if (!drawPoints) {
			throw new Error('The measurement should have draw points');
		}
		const lines = entities.filter((entity) => entity instanceof LineEntity) as LineEntity[];
		const lineEnds = lines.map((line) => [line.getStartPoint(), line.getEndPoint()]);
		expect(lineEnds).toHaveLength(3);
		const expectedLineEnds = [
			[drawPoints.offsetStartPoint, drawPoints.offsetEndPoint],
			[drawPoints.offsetStartPointMargin, drawPoints.offsetStartPointExtend],
			[drawPoints.offsetEndPointMargin, drawPoints.offsetEndPointExtend],
		];
		lineEnds.forEach(([start, end], index) => {
			expectPoint(start, expectedLineEnds[index][0].x, expectedLineEnds[index][0].y);
			expectPoint(end, expectedLineEnds[index][1].x, expectedLineEnds[index][1].y);
		});
		const label = measurement.getLabel(drawPoints);
		const text = entities.find((entity) => entity instanceof TextEntity) as TextEntity;
		expect(text.getLabel()).toBe('100');
		expect(text.getFontSize()).toBe(MEASUREMENT_FONT_SIZE);
		expect(text.getOptions().textAlign).toBe('center');
		expectPoint(text.getBasePoint(), label.basePoint.x, label.basePoint.y);
	});

	it('exports the outline and holes of fills as closed polylines in the fill color', () => {
		const square = (size: number) =>
			new PolyLineEntity([
				new LineEntity(new Point(0, 0), new Point(size, 0)),
				new LineEntity(new Point(size, 0), new Point(size, size)),
				new LineEntity(new Point(size, size), new Point(0, size)),
				new LineEntity(new Point(0, size), new Point(0, 0)),
			]);
		const hole = square(2);
		hole.move(4, 4);
		const fill = new FillEntity(square(10), [hole]);
		fill.fillColor = '#ff0000';
		const { skippedTypes, entities } = exportAndImport([fill]);
		expect(skippedTypes).toEqual([]);
		expect(entities).toHaveLength(2);
		const [outline, importedHole] = entities as PolyLineEntity[];
		expect(outline.lineColor).toBe('#ff0000');
		expect(outline.entities).toHaveLength(4);
		expect(outline.getBoundingBox().xmax).toBeCloseTo(10);
		expect(importedHole.entities).toHaveLength(4);
		expect(importedHole.getBoundingBox().xmin).toBeCloseTo(4);
	});
});

describe('dxf export of layers', () => {
	it('always defines layer 0', () => {
		const walls = createTestLayer('walls', { name: 'Walls' });
		const getLayerNames = (layers: Layer[]) => {
			const lines = convertEntitiesToDxf([], layers, aciColors).dxf.split('\n');
			// The name of a layer table entry follows its LAYER line and group code 2
			return lines.flatMap((line, index) =>
				line === 'LAYER' && lines[index - 1] === '0' && lines[index + 1] === '2'
					? [lines[index + 2]]
					: []
			);
		};
		expect(getLayerNames([walls])).toEqual(['Walls', '0']);
		expect(getLayerNames([createTestLayer('zero', { name: '0' }), walls])).toEqual(['0', 'Walls']);
	});

	it('exports the entities on hidden layers on a layer that is off', async () => {
		const visibleLayer = createTestLayer('visible', { name: 'Visible' });
		const hiddenLayer = createTestLayer('hidden', { name: 'Hidden', isVisible: false });
		const visibleLine = new LineEntity(new Point(0, 0), new Point(1, 0));
		visibleLine.layerId = visibleLayer.id;
		const hiddenLine = new LineEntity(new Point(0, 5), new Point(1, 5));
		hiddenLine.layerId = hiddenLayer.id;
		resetState([visibleLayer, hiddenLayer], [visibleLine, hiddenLine]);

		await exportEntitiesToDxfFile();

		const blob = vi.mocked(saveAs).mock.lastCall?.[0] as Blob;
		const { entities, newLayers } = convertDxfToEntities(await blob.text(), library, []);
		expect(entities).toHaveLength(2);
		const importedHiddenLayer = newLayers.find((layer) => layer.name === 'Hidden');
		expect(importedHiddenLayer?.isVisible).toBe(false);
		expect(entities[1].layerId).toBe(importedHiddenLayer?.id);
	});
});
