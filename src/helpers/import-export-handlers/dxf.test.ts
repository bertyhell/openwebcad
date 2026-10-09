import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Arc, type Circle, Point, type Segment } from '@flatten-js/core';
import * as dxfLibrary from 'dxf';
import { describe, expect, it } from 'vitest';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import { EntityName } from '../../entities/Entity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
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

describe('dxf export', () => {
	it('maps colors to the closest AutoCAD color index', () => {
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
