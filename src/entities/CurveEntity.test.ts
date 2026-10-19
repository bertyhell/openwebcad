import { Point } from '@flatten-js/core';
import * as dxfLibrary from 'dxf';
import { describe, expect, it } from 'vitest';
import { convertEntitiesToDxf } from '../helpers/import-export-handlers/dxf.export.ts';
import { exportEntitiesAndLayersToJsonString } from '../helpers/import-export-handlers/json.export.ts';
import { getEntitiesAndLayersFromJsonString } from '../helpers/import-export-handlers/json.import.ts';
import { getRegularPolygonPoints, PolygonMode } from '../helpers/polygon-points.ts';
import { getSplinePoints } from '../helpers/spline-points.ts';
import { createTestLayer, resetState } from '../test-helpers/reset-state.ts';
import { EllipseEntity } from './EllipseEntity.ts';
import { EntityName } from './Entity.ts';
import { LineEntity } from './LineEntity.ts';
import { SplineEntity } from './SplineEntity.ts';

function expectPoint(point: Point, x: number, y: number) {
	expect(point.x).toBeCloseTo(x);
	expect(point.y).toBeCloseTo(y);
}

describe('getRegularPolygonPoints', () => {
	it('puts the corners on the circle for an inscribed polygon', () => {
		const corners = getRegularPolygonPoints(
			new Point(0, 0),
			new Point(10, 0),
			4,
			PolygonMode.INSCRIBED
		);
		expect(corners).toHaveLength(4);
		expectPoint(corners[0], 10, 0);
		expectPoint(corners[1], 0, 10);
	});

	it('puts the middle of the sides on the circle for a circumscribed polygon', () => {
		const corners = getRegularPolygonPoints(
			new Point(0, 0),
			new Point(10, 0),
			4,
			PolygonMode.CIRCUMSCRIBED
		);
		expectPoint(corners[0], 10, 10);
		expectPoint(corners[3], 10, -10);
	});
});

describe('getSplinePoints', () => {
	it('goes through every fit point', () => {
		const fitPoints = [new Point(0, 0), new Point(10, 10), new Point(20, 0), new Point(30, 10)];
		const points = getSplinePoints(fitPoints);
		for (const fitPoint of fitPoints) {
			expect(
				points.some((point) => Math.hypot(point.x - fitPoint.x, point.y - fitPoint.y) < 1e-9)
			).toBe(true);
		}
		expectPoint(points.at(-1) as Point, 30, 10);
	});

	it('is a straight line for 2 points', () => {
		expect(getSplinePoints([new Point(0, 0), new Point(5, 5)])).toHaveLength(2);
	});
});

describe('EllipseEntity', () => {
	it('has its axis ends as snap points and its size as bounding box', () => {
		const ellipse = new EllipseEntity(new Point(0, 0), new Point(10, 0), 0.5);
		expectPoint(ellipse.getPointAt(Math.PI / 2), 0, 5);
		const box = ellipse.getBoundingBox();
		expect(box.xmax).toBeCloseTo(10);
		expect(box.ymax).toBeCloseTo(5);
		expect(ellipse.getSnapPoints()).toHaveLength(5);
	});

	it('keeps its shape when it is moved, rotated, scaled and mirrored', () => {
		const ellipse = new EllipseEntity(new Point(0, 0), new Point(10, 0), 0.5);
		ellipse.move(5, 0);
		expectPoint(ellipse.getCenter(), 5, 0);
		ellipse.rotate(new Point(5, 0), Math.PI / 2);
		expectPoint(ellipse.getMajorAxisEnd(), 5, 10);
		ellipse.scale(new Point(5, 0), 2);
		expectPoint(ellipse.getMajorAxisEnd(), 5, 20);
		ellipse.mirror(new LineEntity(new Point(0, 0), new Point(1, 0)));
		expectPoint(ellipse.getMajorAxisEnd(), 5, -20);
		expect(ellipse.getRatio()).toBeCloseTo(0.5);
		expect(ellipse.getBoundingBox().ymin).toBeCloseTo(-20);
	});

	it('finds intersections with a line', () => {
		const ellipse = new EllipseEntity(new Point(0, 0), new Point(10, 0), 0.5);
		const line = new LineEntity(new Point(-20, 0), new Point(20, 0));
		const intersections = ellipse.getIntersections(line);
		expect(intersections).toHaveLength(2);
	});
});

describe('ellipse and spline export', () => {
	it('survive a json export and import', async () => {
		const ellipse = new EllipseEntity(new Point(1, 2), new Point(11, 2), 0.25);
		ellipse.layerId = 'layer';
		const spline = new SplineEntity([new Point(0, 0), new Point(5, 5), new Point(10, 0)]);
		spline.layerId = 'layer';
		resetState([createTestLayer('layer')], [ellipse, spline]);

		const file = await getEntitiesAndLayersFromJsonString(
			await exportEntitiesAndLayersToJsonString()
		);

		const [importedEllipse, importedSpline] = file.entities as [EllipseEntity, SplineEntity];
		expect(importedEllipse.getType()).toBe(EntityName.Ellipse);
		expectPoint(importedEllipse.getMajorAxisEnd(), 11, 2);
		expect(importedEllipse.getRatio()).toBe(0.25);
		expect(importedSpline.getFitPoints()).toHaveLength(3);
	});

	it('are exported to dxf as polylines', () => {
		const layers = [createTestLayer('layer')];
		const ellipse = new EllipseEntity(new Point(0, 0), new Point(10, 0), 0.5);
		ellipse.layerId = 'layer';
		const spline = new SplineEntity([new Point(0, 0), new Point(5, 5), new Point(10, 0)]);
		spline.layerId = 'layer';
		const { dxf, skippedTypes } = convertEntitiesToDxf(
			[ellipse, spline],
			layers,
			dxfLibrary.colors as unknown as number[][]
		);
		expect(skippedTypes).toEqual([]);
		expect(dxf.match(/POLYLINE/g)).toHaveLength(2);
	});
});
