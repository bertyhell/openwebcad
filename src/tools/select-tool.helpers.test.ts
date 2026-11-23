import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { LineEntity } from '../entities/LineEntity.ts';
import { createTestLayer, resetState } from '../test-helpers/reset-state.ts';
import { getEntitiesInsideRectangle } from './select-tool.helpers.ts';

describe('getEntitiesInsideRectangle', () => {
	const line = new LineEntity(new Point(0, 0), new Point(10, 10));

	beforeEach(() => {
		line.layerId = 'layer-1';
		resetState([createTestLayer('layer-1')], [line]);
	});

	it('selects nothing with a box of zero size, eg: before the mouse moves after the first click', () => {
		expect(getEntitiesInsideRectangle(new Point(50, 50), new Point(50, 50))).toEqual([]);
	});

	it('selects the entities inside the box', () => {
		expect(getEntitiesInsideRectangle(new Point(-5, -5), new Point(20, 20))).toEqual([line]);
	});
});
