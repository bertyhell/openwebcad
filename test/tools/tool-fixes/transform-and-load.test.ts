import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArrowHeadEntity } from '../../../src/entities/ArrowHeadEntity';
import { LineEntity } from '../../../src/entities/LineEntity';
import { entityFromJson } from '../../../src/helpers/import-export-handlers/json.import';
import {
	getActiveToolActor,
	getDimmedEntityIds,
	getEntities,
	setEntities,
	setSelectedEntityIds,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { ActorEvent } from '../../../src/tools/tool.types';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { getToolState, typePoint } from './tool-events';

describe('transform tools', () => {
	let line: LineEntity;

	beforeEach(() => {
		initApplication();
		line = new LineEntity(new Point(0, 0), new Point(10, 0));
		setEntities([line], true);
		setSelectedEntityIds([line.id]);
	});

	it('stops placing copies with ENTER', () => {
		setActiveTool(Tool.COPY);
		typePoint(0, 0);
		typePoint(0, 10);
		typePoint(0, 20);
		expect(getEntities()).toHaveLength(3);

		getActiveToolActor()?.send({ type: ActorEvent.ENTER });

		expect(getToolState()).toBe('WAITING_FOR_SELECTION');
		expect(getEntities()).toHaveLength(3);
	});

	it('shows the captured selection faded while picking the base point', () => {
		setActiveTool(Tool.MOVE);

		expect(getToolState()).toBe('WAITING_FOR_POINT_0');
		expect(getDimmedEntityIds()).toEqual([line.id]);
	});
});

describe('loading entities', () => {
	it('loads arrow heads from a saved drawing', async () => {
		const arrowHead = new ArrowHeadEntity(new Point(0, 0), new Point(1, 1), new Point(1, -1));

		const loaded = await entityFromJson(JSON.parse(JSON.stringify(await arrowHead.toJson())));

		expect(loaded?.getType()).toBe(arrowHead.getType());
		expect(loaded?.getBoundingBox().xmax).toBeCloseTo(1);
	});
});
