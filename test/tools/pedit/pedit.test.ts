import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StartAndEndpointEntity } from '../../../src/App.types';
import { ArcEntity } from '../../../src/entities/ArcEntity';
import { EntityName } from '../../../src/entities/Entity';
import { LineEntity } from '../../../src/entities/LineEntity';
import type { PolyLineEntity } from '../../../src/entities/PolyLineEntity';
import { joinConnectedSegments } from '../../../src/helpers/order-edge-boundary';
import { getEntities, setEntities, setSelectedEntityIds } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';

function line(x1: number, y1: number, x2: number, y2: number): LineEntity {
	return new LineEntity(new Point(x1, y1), new Point(x2, y2));
}

function expectConnected(chain: StartAndEndpointEntity[]) {
	for (let index = 1; index < chain.length; index++) {
		expect(chain[index - 1].getEndPoint().equalTo(chain[index].getStartPoint())).toBe(true);
	}
}

describe('joinConnectedSegments', () => {
	it('joins segments that connect, in any order and direction', () => {
		const lineA = line(10, 0, 0, 0);
		const lineB = line(10, 0, 10, 10);
		const arc = new ArcEntity(new Point(15, 10), 5, Math.PI, 0, false);
		const { chain, unconnected } = joinConnectedSegments([lineB, arc, lineA]);
		expect(chain).toHaveLength(3);
		expect(unconnected).toEqual([]);
		expectConnected(chain);
	});

	it('leaves out segments that do not connect to the chain', () => {
		const lineA = line(0, 0, 10, 0);
		const lineB = line(10, 0, 10, 10);
		const loose = line(50, 50, 60, 60);
		const { chain, unconnected } = joinConnectedSegments([loose, lineA, lineB]);
		expect(chain).toHaveLength(2);
		expectConnected(chain);
		expect(unconnected).toEqual([loose]);
	});
});

describe('pedit', () => {
	beforeEach(() => {
		initApplication();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('only joins the lines that connect and keeps the others as they are', () => {
		const lineA = line(0, 0, 10, 0);
		lineA.lineColor = '#ff0000';
		const lineB = line(10, 10, 10, 0);
		const loose1 = line(50, 50, 60, 60);
		const loose2 = line(70, 50, 80, 60);
		setEntities([lineA, lineB, loose1, loose2], true);
		setSelectedEntityIds([lineA.id, lineB.id, loose1.id, loose2.id]);
		const infoSpy = vi.spyOn(toast, 'info').mockImplementation(() => 0);

		setActiveTool(Tool.PEDIT);

		const entities = getEntities();
		expect(entities).toHaveLength(3);
		expect(entities).toContain(loose1);
		expect(entities).toContain(loose2);
		const polyLine = entities.find(
			(entity) => entity.getType() === EntityName.PolyLine
		) as PolyLineEntity;
		expect(polyLine.numberOfSegments()).toBe(2);
		expectConnected(polyLine.entities);
		expect(polyLine.lineColor).toBe('#ff0000');
		expect(infoSpy).toHaveBeenCalledWith(
			"2 selected segments don't connect to the polyline and were left out"
		);
	});

	it('joins the longest chain when the first segment in the drawing is a loose one', () => {
		const loose = line(50, 50, 60, 60);
		const lineA = line(0, 0, 10, 0);
		const lineB = line(10, 0, 10, 10);
		setEntities([loose, lineA, lineB], true);
		setSelectedEntityIds([loose.id, lineA.id, lineB.id]);
		vi.spyOn(toast, 'info').mockImplementation(() => 0);

		setActiveTool(Tool.PEDIT);

		const entities = getEntities();
		expect(entities).toContain(loose);
		const polyLine = entities.find(
			(entity) => entity.getType() === EntityName.PolyLine
		) as PolyLineEntity;
		expect(polyLine.numberOfSegments()).toBe(2);
	});
});
