import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Circle } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EllipseEntity } from '../../entities/EllipseEntity.ts';
import type { Entity } from '../../entities/Entity.ts';
import { EntityName } from '../../entities/Entity.ts';
import type { LineEntity } from '../../entities/LineEntity.ts';
import { getActiveLineColor, getEntities } from '../../state.ts';
import { createTestLayer, resetState } from '../../test-helpers/reset-state.ts';
import { getBoundingBoxOfMultipleEntities } from '../get-bounding-box-of-multiple-entities.ts';
import { convertSvgToEntities, importEntitiesFromSvgFile } from './svg.import.ts';

vi.mock('react-toastify', () => ({
	toast: { error: vi.fn(), info: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
// Zooming needs the canvas of the screen
vi.mock('../../tools/zoom-tool.helpers.ts', () => ({ zoomToBounds: vi.fn() }));

function svg(content: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}

function getLineEnds(entities: Entity[]): number[][] {
	return (entities as LineEntity[]).map((line) =>
		[line.getStartPoint(), line.getEndPoint()].flatMap((point) => [
			Math.round(point.x * 1e6) / 1e6,
			Math.round(point.y * 1e6) / 1e6,
		])
	);
}

function getBounds(entities: Entity[]) {
	const { minX, minY, maxX, maxY } = getBoundingBoxOfMultipleEntities(entities);
	return [minX, minY, maxX, maxY].map((value) => Math.round(value * 1e6) / 1e6);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('svg import of points', () => {
	it('closes polygons without reading past their last point', () => {
		const entities = convertSvgToEntities(svg('<polygon points="0 0 10 0 10 10"/>'));
		expect(entities).toHaveLength(3);
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('reads points separated by commas, new lines and multiple spaces', () => {
		for (const points of ['0,0 10,0 10,10', '0 0\n10 0\n10  10', '0,0,10,0,10,10']) {
			const entities = convertSvgToEntities(svg(`<polygon points="${points}"/>`));
			// The drawing is mirrored over the middle of the svg, which is at y = 5
			expect(getLineEnds(entities)).toEqual([
				[0, 10, 10, 10],
				[10, 10, 10, 0],
				[10, 0, 0, 10],
			]);
		}
	});
});

describe('svg import of shapes', () => {
	it('places rectangles without x and y at 0', () => {
		const entities = convertSvgToEntities(svg('<rect width="10" height="20"/>'));
		expect(entities[0].getType()).toBe(EntityName.Rectangle);
		expect(getBounds(entities)).toEqual([0, 0, 10, 20]);
	});

	it('imports circles, ellipses, lines and polylines', () => {
		const entities = convertSvgToEntities(
			svg(`
				<circle cx="10" cy="10" r="5"/>
				<ellipse cx="50" cy="10" rx="20" ry="10"/>
				<line x1="0" y1="30" x2="10" y2="30"/>
				<polyline points="0,40 10,40 10,50"/>
			`)
		);
		expect(entities.map((entity) => entity.getType())).toEqual([
			EntityName.Circle,
			EntityName.Ellipse,
			EntityName.Line,
			EntityName.Line,
			EntityName.Line,
		]);
		expect((entities[0].getShape() as Circle).r.valueOf()).toBe(5);
		const ellipse = entities[1] as EllipseEntity;
		expect(ellipse.getCenter().x).toBeCloseTo(50);
		expect(ellipse.getRatio()).toBeCloseTo(0.5);
		expect(Math.abs(ellipse.getMajorAxisEnd().x - 50)).toBeCloseTo(20);
		// A polyline isn't closed
		expect(getLineEnds(entities.slice(3))).toHaveLength(2);
	});

	it('keeps the top of the svg at the top of the drawing', () => {
		const entities = convertSvgToEntities(
			svg('<line x1="0" y1="0" x2="10" y2="0"/><line x1="0" y1="100" x2="10" y2="100"/>')
		);
		const [top, bottom] = entities as LineEntity[];
		expect(top.getStartPoint().y).toBeGreaterThan(bottom.getStartPoint().y);
	});

	it('still imports paths', () => {
		const entities = convertSvgToEntities(svg('<path d="M 0 0 L 10 0 L 10 10"/>'));
		expect(entities.map((entity) => entity.getType())).toEqual([EntityName.Line, EntityName.Line]);
	});

	it('ignores text, comments and character data instead of looping forever', () => {
		const entities = convertSvgToEntities(
			svg(
				'<style><![CDATA[.wall { stroke: red; }]]></style><text x="0" y="0">Label</text><line x1="0" y1="0" x2="10" y2="0"/>'
			)
		);
		expect(entities.map((entity) => entity.getType())).toEqual([EntityName.Line]);
	});

	it('ignores shapes that are only definitions, eg: clip paths', () => {
		const entities = convertSvgToEntities(
			svg(
				'<defs><clipPath id="clip"><rect width="5" height="5"/></clipPath></defs><line x1="0" y1="0" x2="10" y2="0"/>'
			)
		);
		expect(entities.map((entity) => entity.getType())).toEqual([EntityName.Line]);
	});
});

describe('svg import of transformations', () => {
	it('applies the translation, scale and rotation of elements and their groups', () => {
		const entities = convertSvgToEntities(
			svg(`
				<g transform="translate(100, 0)">
					<rect width="10" height="10" transform="scale(2)"/>
					<g transform="rotate(90)">
						<line x1="0" y1="0" x2="10" y2="0"/>
					</g>
				</g>
			`)
		);
		// The rectangle covers 100,0 to 120,20 and the line goes from 100,0 to 100,10 in svg coordinates
		expect(getBounds(entities.slice(0, 1))).toEqual([100, 0, 120, 20]);
		expect(getLineEnds(entities.slice(1))).toEqual([[100, 20, 100, 10]]);
	});

	it('applies matrices, eg: a matrix that flips the y axis like pdf to svg converters do', () => {
		const entities = convertSvgToEntities(
			svg(`
				<path d="M 0 0 L 100 0" transform="matrix(0.1, 0, 0, -0.1, 0, 50)"/>
				<line x1="0" y1="0" x2="10" y2="0"/>
			`)
		);
		// The path ends up at y = 50 in svg coordinates, which is the bottom of the drawing
		expect(getLineEnds(entities)).toEqual([
			[0, 0, 10, 0],
			[0, 50, 10, 50],
		]);
	});

	it('turns circles into ellipses when they are scaled differently along x and y', () => {
		const entities = convertSvgToEntities(svg('<circle r="10" transform="scale(2, 1)"/>'));
		expect(entities[0].getType()).toBe(EntityName.Ellipse);
		expect((entities[0] as EllipseEntity).getRatio()).toBeCloseTo(0.5);
	});

	it('imports the rectangle, circle, polygon and paths of the svg import mock', () => {
		const mock = readFileSync(
			resolve(__dirname, '../../../test/mocks/test-svg-import.svg'),
			'utf-8'
		);
		const entities = convertSvgToEntities(mock);
		const types = entities.map((entity) => entity.getType());
		expect(types.slice(0, 2)).toEqual([EntityName.Rectangle, EntityName.Circle]);
		expect((entities[1].getShape() as Circle).r.valueOf()).toBeCloseTo(33.689);
		expect(types.slice(2).every((type) => type === EntityName.Line)).toBe(true);
		// The triangle has 3 sides, the polygon 9 and the curved path is approximated by several lines
		expect(types.length - 2).toBeGreaterThan(3 + 9);
		const [minX, minY, maxX, maxY] = getBounds(entities);
		expect([minX, minY]).toEqual([37.923, 12.15]);
		expect(maxX).toBeCloseTo(236.745);
		expect(maxY).toBeCloseTo(198.085);
	});

	it('imports the floorplan mock, which uses a matrix on every path', () => {
		const floorplan = readFileSync(
			resolve(__dirname, '../../../test/mocks/floorplan.svg'),
			'utf-8'
		);
		const entities = convertSvgToEntities(floorplan);
		expect(entities.length).toBeGreaterThan(0);
		const [minX, minY, maxX, maxY] = getBounds(entities);
		// The paths are drawn 10 times larger and scaled down by their matrix, so they fit the 2292 by 2025 svg
		expect(minX).toBeGreaterThanOrEqual(0);
		expect(minY).toBeGreaterThanOrEqual(0);
		expect(maxX).toBeLessThanOrEqual(2292);
		expect(maxY).toBeLessThanOrEqual(2025);
	});
});

describe('svg import of stroke colors', () => {
	it('uses the stroke of an element or its group as the line color', () => {
		const entities = convertSvgToEntities(
			svg(`
				<line x1="0" y1="0" x2="10" y2="0" stroke="#ff0000"/>
				<g style="fill: none; stroke: rgb(0, 0, 255)">
					<line x1="0" y1="10" x2="10" y2="10"/>
					<line x1="0" y1="20" x2="10" y2="20" style="stroke:#0f0"/>
				</g>
				<line x1="0" y1="30" x2="10" y2="30" stroke="rgb(100%, 50%, 0%)"/>
			`)
		);
		expect(entities.map((entity) => entity.lineColor)).toEqual([
			'#ff0000',
			'#0000ff',
			'#00ff00',
			'#ff8000',
		]);
	});

	it('shows black strokes in white and uses the active line color without a stroke', () => {
		const entities = convertSvgToEntities(
			svg(`
				<line x1="0" y1="0" x2="10" y2="0" stroke="rgb(0%, 0%, 0%)"/>
				<line x1="0" y1="10" x2="10" y2="10"/>
				<line x1="0" y1="20" x2="10" y2="20" stroke="none"/>
			`)
		);
		expect(entities.map((entity) => entity.lineColor)).toEqual([
			'#ffffff',
			getActiveLineColor(),
			getActiveLineColor(),
		]);
	});
});

describe('svg file import', () => {
	beforeEach(() => {
		resetState([createTestLayer('layer')]);
	});

	it('adds the entities of the file to the drawing', async () => {
		await importEntitiesFromSvgFile(
			new File([svg('<line x1="0" y1="0" x2="10" y2="0"/>')], 'drawing.svg')
		);
		expect(getEntities()).toHaveLength(1);
	});

	it('shows an error and settles when the file is not a valid svg', async () => {
		await importEntitiesFromSvgFile(new File(['<svg><rect'], 'broken.svg'));
		expect(toast.error).toHaveBeenCalled();
		expect(getEntities()).toHaveLength(0);
	});

	it('settles when no file is chosen', async () => {
		await expect(importEntitiesFromSvgFile(undefined)).resolves.toBeUndefined();
	});
});
