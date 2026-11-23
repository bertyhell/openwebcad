import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import { LineEntity } from '../../../src/entities/LineEntity';
import {
	getEntities,
	getLayers,
	getSelectedEntityIds,
	setEntities,
	setLayers,
	setSelectedEntityIds,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';

describe('group and explode without something to act on', () => {
	let line: LineEntity;
	let circle: CircleEntity;

	beforeEach(() => {
		initApplication();
		line = new LineEntity(new Point(0, 0), new Point(100, 0));
		circle = new CircleEntity(new Point(50, 50), 20);
		setEntities([line, circle], true);
	});

	it('keeps the selection when grouping a single entity', () => {
		setSelectedEntityIds([line.id]);
		setActiveTool(Tool.GROUP);

		expect(getEntities()).toEqual([line, circle]);
		expect(getSelectedEntityIds()).toEqual([line.id]);
	});

	it('does not count entities on a locked layer when grouping', () => {
		const lockedLayer = { id: 'locked', name: 'Locked', isVisible: true, isLocked: true };
		setLayers([...getLayers(), lockedLayer]);
		circle.layerId = lockedLayer.id;
		setSelectedEntityIds([line.id, circle.id]);
		setActiveTool(Tool.GROUP);

		expect(getEntities()).toEqual([line, circle]);
		expect(getSelectedEntityIds()).toEqual([line.id, circle.id]);
	});

	it('keeps the selection when nothing can be exploded', () => {
		setSelectedEntityIds([line.id, circle.id]);
		setActiveTool(Tool.EXPLODE);

		expect(getEntities()).toEqual([line, circle]);
		expect(getSelectedEntityIds()).toEqual([line.id, circle.id]);
	});
});
