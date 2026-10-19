import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import { EntityName } from '../../../src/entities/Entity';
import { LineEntity } from '../../../src/entities/LineEntity';
import { RectangleEntity } from '../../../src/entities/RectangleEntity';
import {
	getActiveToolActor,
	getEntities,
	getSelectedEntityIds,
	setEntities,
	setSelectedEntityIds,
	undo,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';

describe('tools that act on the selection', () => {
	let line: LineEntity;
	let circle: CircleEntity;

	beforeEach(() => {
		initApplication();
		line = new LineEntity(new Point(0, 0), new Point(100, 0));
		circle = new CircleEntity(new Point(50, 50), 20);
		setEntities([line, circle], true);
	});

	it('erases the selected entities right away and can be undone', () => {
		setSelectedEntityIds([line.id]);
		setActiveTool(Tool.ERASE);

		expect(getEntities()).toEqual([circle]);
		expect(getActiveToolActor()?.getSnapshot().context.type).toBe(Tool.SELECT);

		undo();
		expect(getEntities()).toHaveLength(2);
	});

	it('waits for a selection when nothing is selected', () => {
		setActiveTool(Tool.ERASE);

		expect(getEntities()).toHaveLength(2);
		expect(getActiveToolActor()?.getSnapshot().context.type).toBe(Tool.ERASE);
	});

	it('groups the selection and selects the group', () => {
		setSelectedEntityIds([line.id, circle.id]);
		setActiveTool(Tool.GROUP);

		const entities = getEntities();
		expect(entities).toHaveLength(1);
		expect(entities[0].getType()).toBe(EntityName.Group);
		expect(getSelectedEntityIds()).toEqual([entities[0].id]);
	});

	it('explodes a rectangle into lines', () => {
		const rectangle = new RectangleEntity(new Point(0, 0), new Point(10, 10));
		setEntities([rectangle], true);
		setSelectedEntityIds([rectangle.id]);
		setActiveTool(Tool.EXPLODE);

		expect(getEntities().map((entity) => entity.getType())).toEqual(
			new Array(4).fill(EntityName.Line)
		);
	});
});
