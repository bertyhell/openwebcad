import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Arc, type Circle, Point, type Segment } from '@flatten-js/core';
import * as dxfLibrary from 'dxf';
import { describe, expect, it } from 'vitest';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import type { EllipseEntity } from '../../entities/EllipseEntity.ts';
import { EntityName } from '../../entities/Entity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
import type { SplineEntity } from '../../entities/SplineEntity.ts';
import { TextEntity } from '../../entities/TextEntity.ts';
import { createTestLayer } from '../../test-helpers/reset-state.ts';
import { convertEntitiesToDxf, hexToAci } from './dxf.export.ts';
import {
	convertDxfToEntities,
	createArcFromBulge,
	type DxfLibrary,
	stripMTextFormatting,
} from './dxf.import.ts';

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
