import { Point, type Segment } from '@flatten-js/core';
import * as dxfLibrary from 'dxf';
import { describe, expect, it } from 'vitest';
import type { StartAndEndpointEntity } from '../App.types.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { TextEntity } from '../entities/TextEntity.ts';
import { createTestLayer } from '../test-helpers/reset-state.ts';
import { rotateEntities } from '../tools/rotate-tool.helpers.ts';
import { convertEntitiesToDxf } from './import-export-handlers/dxf.export.ts';
import { convertDxfToEntities, type DxfLibrary } from './import-export-handlers/dxf.import.ts';
import { offsetEntity } from './offset-entity.ts';
import { chainSegments } from './order-edge-boundary.ts';

const aciColors = dxfLibrary.colors as unknown as number[][];

function expectConnected(chain: StartAndEndpointEntity[]) {
	for (let index = 1; index < chain.length; index++) {
		expect(chain[index - 1].getEndPoint().equalTo(chain[index].getStartPoint())).toBe(true);
	}
}

describe('chainSegments', () => {
	it('orders and flips segments into one chain from one free end to the other', () => {
		const lineA = new LineEntity(new Point(10, 0), new Point(0, 0));
		const lineB = new LineEntity(new Point(10, 0), new Point(10, 10));
		const lineC = new LineEntity(new Point(20, 10), new Point(10, 10));
		const chain = chainSegments([lineB, lineC, lineA] as StartAndEndpointEntity[]);
		expect(chain).toHaveLength(3);
		expectConnected(chain);
		const ends = [chain[0].getStartPoint(), chain[2].getEndPoint()].map((point) =>
			[point.x, point.y].join(',')
		);
		expect(ends.sort()).toEqual(['0,0', '20,10']);
	});

	it('connects arcs and lines', () => {
		const arc = new ArcEntity(new Point(0, 0), 10, 0, Math.PI / 2, true);
		const line = new LineEntity(new Point(20, 0), new Point(10, 0));
		const chain = chainSegments([line, arc] as StartAndEndpointEntity[]);
		expect(chain.map((segment) => segment.getType()).sort()).toEqual(['Arc', 'Line']);
		expectConnected(chain);
	});
});

describe('polylines with reversed segments', () => {
	const polyLine = new PolyLineEntity([
		new LineEntity(new Point(10, 0), new Point(0, 0)),
		new LineEntity(new Point(10, 0), new Point(10, 10)),
	]);

	it('offsets them as one chain', () => {
		const offset = offsetEntity(polyLine, 1, new Point(5, 5)) as PolyLineEntity;
		expect(offset.entities).toHaveLength(2);
		const end = (offset.entities[1].getShape() as Segment).end;
		expect(end.x).toBeCloseTo(9);
		expect(end.y).toBeCloseTo(10);
	});

	it('exports every segment to dxf', () => {
		const layer = createTestLayer('layer', { name: 'Layer 1' });
		polyLine.layerId = layer.id;
		const { dxf } = convertEntitiesToDxf([polyLine], [layer], aciColors);
		const { entities } = convertDxfToEntities(dxf, dxfLibrary as unknown as DxfLibrary, []);
		expect((entities[0] as PolyLineEntity).entities).toHaveLength(2);
	});
});

describe('dxf export and import of entities without a shape', () => {
	it('keeps every text and polyline on the same layer', () => {
		const layer = createTestLayer('layer');
		const entities = [
			new TextEntity('A', new Point(0, 0), { fontSize: 5 }),
			new TextEntity('B', new Point(0, 10), { fontSize: 5 }),
			new PolyLineEntity([new LineEntity(new Point(0, 0), new Point(1, 1))]),
			new PolyLineEntity([new LineEntity(new Point(5, 5), new Point(6, 6))]),
		];
		for (const entity of entities) {
			entity.layerId = layer.id;
		}
		const { dxf } = convertEntitiesToDxf(entities, [layer], aciColors);
		const imported = convertDxfToEntities(dxf, dxfLibrary as unknown as DxfLibrary, []);
		expect(imported.entities).toHaveLength(4);
	});

	it('writes valid and unique R12 layer names and the line type table', () => {
		const layers = [
			createTestLayer('a', { name: 'Layer 1' }),
			createTestLayer('b', { name: 'Layer_1' }),
		];
		const { dxf } = convertEntitiesToDxf([], layers, aciColors);
		expect(dxf).toContain('\nLayer_1\n');
		expect(dxf).toContain('\nLayer_1_2\n');
		expect(dxf).toContain('\nLTYPE\n2\nCONTINUOUS\n');
	});
});

describe('rotateEntities', () => {
	it('ignores points on top of the origin instead of throwing', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		expect(() =>
			rotateEntities([line], new Point(0, 0), new Point(0, 0), new Point(5, 5))
		).not.toThrow();
		expect(line.getEndPoint().equalTo(new Point(10, 0))).toBe(true);
	});
});
