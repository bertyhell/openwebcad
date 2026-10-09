import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { createTestLayer, resetState } from '../../test-helpers/reset-state.ts';
import { exportEntitiesAndLayersToJsonString } from './json.export.ts';
import { getEntitiesAndLayersFromJsonString } from './json.import.ts';

describe('json export and import', () => {
	it('keeps entities, their style and their layers', async () => {
		const line = new LineEntity(new Point(1, 2), new Point(3, 4));
		line.layerId = 'walls';
		line.lineColor = '#ff0000';
		line.lineWidth = 3;
		const circle = new CircleEntity(new Point(5, 5), 2);
		circle.layerId = 'doors';
		const layers = [
			createTestLayer('walls', { name: 'Walls', color: '#ff0000' }),
			createTestLayer('doors', { isLocked: true }),
		];
		resetState(layers, [line, circle]);

		const json = await exportEntitiesAndLayersToJsonString();
		const file = await getEntitiesAndLayersFromJsonString(json);

		expect(file.layers).toEqual(layers);
		expect(file.entities).toHaveLength(2);

		const [importedLine, importedCircle] = file.entities as [LineEntity, CircleEntity];
		expect(importedLine.id).toBe(line.id);
		expect(importedLine.layerId).toBe('walls');
		expect(importedLine.lineColor).toBe('#ff0000');
		expect(importedLine.lineWidth).toBe(3);
		expect(importedLine.getStartPoint().equalTo(new Point(1, 2))).toBe(true);
		expect(importedLine.getEndPoint().equalTo(new Point(3, 4))).toBe(true);
		expect(importedCircle.layerId).toBe('doors');
		expect(importedCircle.getCenter().equalTo(new Point(5, 5))).toBe(true);
		expect(importedCircle.getRadius()).toBe(2);
	});
});
