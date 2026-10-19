import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { EntityName } from '../entities/Entity.ts';
import { flattenGroups, GroupEntity } from '../entities/GroupEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { MeasurementEntity } from '../entities/MeasurementEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { createTestLayer, resetState } from '../test-helpers/reset-state.ts';
import { explodeEntities, explodeEntity } from './explode-entity.ts';
import { groupEntities } from './group-entities.ts';
import { exportEntitiesAndLayersToJsonString } from './import-export-handlers/json.export.ts';
import { getEntitiesAndLayersFromJsonString } from './import-export-handlers/json.import.ts';

describe('groupEntities', () => {
	it('replaces the selected entities by one group at the position of the topmost member', () => {
		const line1 = new LineEntity(new Point(0, 0), new Point(10, 0));
		const circle = new CircleEntity(new Point(5, 5), 2);
		const line2 = new LineEntity(new Point(0, 10), new Point(10, 10));

		const result = groupEntities([line1, line2], [line1, circle, line2]);

		expect(result.group?.entities).toEqual([line1, line2]);
		expect(result.entities).toEqual([circle, result.group]);
	});

	it('needs at least 2 entities', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		expect(groupEntities([line], [line]).group).toBeNull();
	});
});

describe('GroupEntity', () => {
	it('moves its members and changes their color', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const circle = new CircleEntity(new Point(5, 5), 2);
		const group = new GroupEntity([line, circle]);

		group.move(1, 2);
		group.lineColor = '#ff0000';

		expect(line.getFirstPoint()?.x).toBe(1);
		expect(line.getFirstPoint()?.y).toBe(2);
		expect(circle.lineColor).toBe('#ff0000');
		expect(group.getBoundingBox().xmax).toBe(11);
	});

	it('is flattened for export, also when nested', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const circle = new CircleEntity(new Point(5, 5), 2);
		const nestedGroup = new GroupEntity([new GroupEntity([line]), circle]);
		expect(flattenGroups([nestedGroup])).toEqual([line, circle]);
	});

	it('survives a json export and import', async () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.layerId = 'layer';
		const circle = new CircleEntity(new Point(5, 5), 2);
		circle.layerId = 'layer';
		const group = new GroupEntity([line, circle]);
		resetState([createTestLayer('layer')], [group]);

		const file = await getEntitiesAndLayersFromJsonString(
			await exportEntitiesAndLayersToJsonString()
		);

		expect(file.entities).toHaveLength(1);
		const importedGroup = file.entities[0] as GroupEntity;
		expect(importedGroup.getType()).toBe(EntityName.Group);
		expect(importedGroup.id).toBe(group.id);
		expect(importedGroup.entities.map((entity) => entity.getType())).toEqual([
			EntityName.Line,
			EntityName.Circle,
		]);
	});
});

describe('explodeEntity', () => {
	it('splits a rectangle into 4 lines with the same style', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 5));
		rectangle.lineColor = '#00ff00';
		const parts = explodeEntity(rectangle);
		expect(parts).toHaveLength(4);
		expect(parts?.every((part) => part.getType() === EntityName.Line)).toBe(true);
		expect(parts?.every((part) => part.lineColor === '#00ff00')).toBe(true);
	});

	it('splits a polyline into its segments', () => {
		const polyLine = new PolyLineEntity([
			new LineEntity(new Point(0, 0), new Point(10, 0)),
			new LineEntity(new Point(10, 0), new Point(10, 10)),
		]);
		expect(explodeEntity(polyLine)).toHaveLength(2);
	});

	it('splits a measurement into 3 lines and a text', () => {
		const measurement = new MeasurementEntity(
			new Point(0, 0),
			new Point(100, 0),
			new Point(50, 20)
		);
		const types = explodeEntity(measurement)?.map((part) => part.getType());
		expect(types).toEqual([EntityName.Line, EntityName.Line, EntityName.Line, EntityName.Text]);
	});

	it('ungroups a group', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const circle = new CircleEntity(new Point(5, 5), 2);
		const parts = explodeEntity(new GroupEntity([line, circle]));
		expect(parts?.map((part) => part.getType())).toEqual([EntityName.Line, EntityName.Circle]);
	});

	it('keeps entities that cannot be exploded', () => {
		const circle = new CircleEntity(new Point(5, 5), 2);
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		const result = explodeEntities([circle, line], [circle, line]);
		expect(result.entities).toEqual([circle, line]);
		expect(result.explodedEntities).toEqual([]);
	});
});
