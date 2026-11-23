import { Point } from '@flatten-js/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { entityFromJson } from '../helpers/import-export-handlers/json.import.ts';
import { ArcEntity } from './ArcEntity.ts';
import { ArrowHeadEntity, type ArrowHeadJsonData } from './ArrowHeadEntity.ts';
import { CircleEntity } from './CircleEntity.ts';
import { EllipseEntity } from './EllipseEntity.ts';
import type { Entity, JsonEntity } from './Entity.ts';
import { FillEntity } from './FillEntity.ts';
import { GroupEntity } from './GroupEntity.ts';
import { ImageEntity } from './ImageEntity.ts';
import { LineEntity } from './LineEntity.ts';
import { MeasurementEntity } from './MeasurementEntity.ts';
import { PointEntity } from './PointEntity.ts';
import { PolyLineEntity } from './PolyLineEntity.ts';
import { RectangleEntity } from './RectangleEntity.ts';
import { SplineEntity } from './SplineEntity.ts';
import { TextEntity } from './TextEntity.ts';

const DASH = [4, 2];

function point(x: number, y: number): Point {
	return new Point(x, y);
}

function triangle(): PolyLineEntity {
	return new PolyLineEntity([
		new LineEntity(point(0, 0), point(10, 0)),
		new LineEntity(point(10, 0), point(5, 10)),
		new LineEntity(point(5, 10), point(0, 0)),
	]);
}

/**
 * Saves the entity the same way the drawing is saved and loads it again
 */
async function roundTrip<T extends Entity>(entity: T): Promise<T> {
	const json = JSON.parse(JSON.stringify(await entity.toJson())) as JsonEntity;
	return (await entityFromJson(json)) as T;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('line dash in the saved drawing', () => {
	const createEntities: Record<string, () => Entity> = {
		line: () => new LineEntity(point(0, 0), point(10, 0)),
		arc: () => new ArcEntity(point(0, 0), 5, 0, Math.PI, true),
		circle: () => new CircleEntity(point(0, 0), 5),
		rectangle: () => new RectangleEntity(point(0, 0), point(10, 10)),
		point: () => new PointEntity(point(1, 1)),
		measurement: () => new MeasurementEntity(point(0, 0), point(10, 0), point(5, 5)),
		text: () => new TextEntity('hello', point(0, 0)),
		polyline: () => triangle(),
		fill: () => new FillEntity(triangle()),
		ellipse: () => new EllipseEntity(point(0, 0), point(10, 0), 0.5),
		spline: () => new SplineEntity([point(0, 0), point(5, 5), point(10, 0)]),
		image: () =>
			new ImageEntity(
				{ src: 'data:image/png;base64,' } as HTMLImageElement,
				point(0, 0),
				point(10, 5)
			),
	};

	for (const [name, createEntity] of Object.entries(createEntities)) {
		it(`keeps the line dash of a ${name}`, async () => {
			// Images are loaded with the browser's Image class
			vi.stubGlobal('Image', class {});
			const entity = createEntity();
			entity.lineDash = [...DASH];
			const loadedEntity = await roundTrip(entity);
			expect(loadedEntity.lineDash).toEqual(DASH);
		});
	}

	it('keeps the line dash of an arrow head', async () => {
		const arrowHead = new ArrowHeadEntity(point(0, 0), point(-5, 2), point(-5, -2));
		arrowHead.lineDash = [...DASH];
		const json = JSON.parse(JSON.stringify(await arrowHead.toJson()));
		const loadedArrowHead = await ArrowHeadEntity.fromJson(json as JsonEntity<ArrowHeadJsonData>);
		expect(loadedArrowHead.lineDash).toEqual(DASH);
	});

	it('keeps the line dash of every member of a group', async () => {
		const dashedLine = new LineEntity(point(0, 0), point(10, 0));
		dashedLine.lineDash = [...DASH];
		const solidCircle = new CircleEntity(point(0, 0), 5);
		const group = await roundTrip(new GroupEntity([dashedLine, solidCircle]));
		expect(group.entities[0].lineDash).toEqual(DASH);
		expect(group.entities[1].lineDash).toBeUndefined();
	});

	it('loads drawings that were saved before the line dash was stored', async () => {
		const json = (await new LineEntity(point(0, 0), point(10, 0)).toJson()) as JsonEntity;
		delete json.lineDash;
		const loadedLine = await entityFromJson(json);
		expect(loadedLine?.lineDash).toBeUndefined();
	});
});
