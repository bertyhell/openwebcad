import { Point, Polygon } from '@flatten-js/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEY } from '../../../src/App.types';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import { EntityName } from '../../../src/entities/Entity';
import { LineEntity } from '../../../src/entities/LineEntity';
import { MeasurementEntity } from '../../../src/entities/MeasurementEntity';
import { PolyLineEntity } from '../../../src/entities/PolyLineEntity';
import { RectangleEntity } from '../../../src/entities/RectangleEntity';
import { getEntitiesAndLayersFromJsonString } from '../../../src/helpers/import-export-handlers/json.import';
import { getEntitiesAndLayersFromLocalStorage } from '../../../src/helpers/import-export-handlers/local-storage.import';
import type { InputController } from '../../../src/inputController/input-controller';
import {
	getActiveToolActor,
	getEntities,
	setEntities,
	setSelectedEntityIds,
	undo,
} from '../../../src/state';
import { Tool } from '../../../src/tools';
import { ActorEvent } from '../../../src/tools/tool.types';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';

function typePoint(x: number, y: number) {
	getActiveToolActor()?.send({ type: ActorEvent.ABSOLUTE_POINT_INPUT, value: new Point(x, y) });
}

function getToolState() {
	return getActiveToolActor()?.getSnapshot().value;
}

describe('crash and data loss fixes', () => {
	let inputController: InputController;

	beforeEach(() => {
		inputController = initApplication();
	});

	describe('rectangle', () => {
		it('does not create a rectangle without a width or height', () => {
			setActiveTool(Tool.RECTANGLE);
			typePoint(0, 0);
			typePoint(100, 0);

			expect(getEntities()).toHaveLength(0);
			expect(getToolState()).toBe('WAITING_FOR_END_POINT');

			typePoint(100, 50);
			expect(getEntities()).toHaveLength(1);
		});

		it('returns snap points for a flat rectangle instead of throwing', () => {
			const flatRectangle = new RectangleEntity(
				new Polygon([new Point(0, 0), new Point(100, 0), new Point(100, 0), new Point(0, 0)])
			);

			expect(() => flatRectangle.getSnapPoints()).not.toThrow();
		});
	});

	describe('open polyline', () => {
		it('survives saving and loading the drawing', async () => {
			const polyLine = new PolyLineEntity([
				new LineEntity(new Point(0, 0), new Point(100, 0)),
				new LineEntity(new Point(100, 0), new Point(100, 100)),
			]);
			const json = JSON.stringify({
				entities: [await polyLine.toJson()],
				layers: [{ id: polyLine.layerId, name: 'Layer 1', isVisible: true, isLocked: false }],
			});

			const { entities } = await getEntitiesAndLayersFromJsonString(json);

			expect(entities).toHaveLength(1);
			const loadedPolyLine = entities[0] as PolyLineEntity;
			expect(loadedPolyLine.numberOfSegments()).toBe(2);
			expect(loadedPolyLine.entities[1].getEndPoint().equalTo(new Point(100, 100))).toBe(true);
		});
	});

	describe('measurement', () => {
		it('does not accept an end point on the start point', () => {
			setActiveTool(Tool.DIMLINEAR);
			typePoint(0, 0);
			typePoint(0, 0);

			expect(getToolState()).toBe('WAITING_FOR_END_POINT');
		});

		it('has a bounding box when it has zero length', () => {
			const measurement = new MeasurementEntity(
				new Point(0, 0),
				new Point(0, 0),
				new Point(10, 10)
			);

			expect(() => measurement.getBoundingBox()).not.toThrow();
		});
	});

	describe('undo while drawing a polyline', () => {
		it('removes the last point instead of undoing the previous command', () => {
			const circle = new CircleEntity(new Point(500, 500), 10);
			setEntities([circle], true);
			setActiveTool(Tool.POLYLINE);
			typePoint(0, 0);
			typePoint(100, 0);
			typePoint(100, 100);

			inputController.handleUndo();

			expect(getEntities()).toEqual([circle]);
			expect(getActiveToolActor()?.getSnapshot().context.points).toHaveLength(2);

			// Undoing every point starts the polyline over, the next undo undoes the previous command
			inputController.handleUndo();
			inputController.handleUndo();
			expect(getToolState()).toBe('WAITING_FOR_FIRST_POINT');
			expect(getEntities()).toEqual([circle]);

			inputController.handleUndo();
			expect(getEntities()).toEqual([]);
			expect(getActiveToolActor()?.getSnapshot().context.type).toBe(Tool.POLYLINE);
		});
	});

	describe('undo while a tool that acts on the selection is active', () => {
		it('does not erase the selection when the erase tool restarts', () => {
			const line = new LineEntity(new Point(0, 0), new Point(10, 0));
			const circle = new CircleEntity(new Point(100, 100), 10);
			setEntities([line], true);
			setEntities([line, circle], true);
			setActiveTool(Tool.ERASE);
			setSelectedEntityIds([line.id]);

			inputController.handleUndo();

			expect(getEntities()).toEqual([line]);
			expect(getActiveToolActor()?.getSnapshot().context.type).toBe(Tool.ERASE);

			setSelectedEntityIds([line.id]);
			inputController.handleRedo();

			expect(getEntities()).toEqual([line, circle]);
		});
	});

	describe('pedit', () => {
		it('keeps selected entities that are not lines or arcs, and keeps the style', () => {
			const line = new LineEntity(new Point(0, 0), new Point(10, 0));
			line.lineColor = '#ff0000';
			line.lineWidth = 3;
			const circle = new CircleEntity(new Point(100, 100), 10);
			setEntities([line, circle], true);
			setSelectedEntityIds([line.id, circle.id]);

			setActiveTool(Tool.PEDIT);

			const entities = getEntities();
			expect(entities).toHaveLength(2);
			expect(entities).toContain(circle);
			const polyLine = entities.find(
				(entity) => entity.getType() === EntityName.PolyLine
			) as PolyLineEntity;
			expect(polyLine.lineColor).toBe('#ff0000');
			expect(polyLine.lineWidth).toBe(3);
		});

		it('does not change the original lines when the polyline is restyled', () => {
			const line = new LineEntity(new Point(0, 0), new Point(10, 0));
			line.lineColor = '#ff0000';
			setEntities([line], true);
			setSelectedEntityIds([line.id]);
			setActiveTool(Tool.PEDIT);

			const polyLine = getEntities()[0] as PolyLineEntity;
			polyLine.lineColor = '#00ff00';
			polyLine.draw({
				setLineStyles: () => {},
				drawLine: () => {},
			} as never);
			undo();

			expect(getEntities()).toEqual([line]);
			expect(line.lineColor).toBe('#ff0000');
		});

		it('does nothing when no lines or arcs are selected', () => {
			const circle = new CircleEntity(new Point(100, 100), 10);
			setEntities([circle], true);
			setSelectedEntityIds([circle.id]);

			setActiveTool(Tool.PEDIT);

			expect(getEntities()).toEqual([circle]);
		});
	});

	describe('loading the saved drawing', () => {
		let storage: Record<string, string>;

		beforeEach(() => {
			storage = {};
			vi.stubGlobal('localStorage', {
				getItem: (key: string) => storage[key] ?? null,
				setItem: (key: string, value: string) => {
					storage[key] = value;
				},
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('skips entities it does not know and backs up the saved drawing', async () => {
			const line = new LineEntity(new Point(0, 0), new Point(10, 0));
			const json = JSON.stringify({
				entities: [await line.toJson(), { id: 'unknown', type: 'Hyperdrive', shapeData: null }],
				layers: [{ id: line.layerId, name: 'Layer 1', isVisible: true, isLocked: false }],
			});
			storage[LOCAL_STORAGE_KEY.DRAWING] = json;

			const file = await getEntitiesAndLayersFromLocalStorage();

			expect(file.entities).toHaveLength(1);
			expect(file.skippedEntityCount).toBe(1);
			expect(storage[LOCAL_STORAGE_KEY.DRAWING_BACKUP]).toBe(json);
		});

		it('starts with an empty drawing and backs up a saved drawing that is not valid json', async () => {
			storage[LOCAL_STORAGE_KEY.DRAWING] = '{not json';

			const file = await getEntitiesAndLayersFromLocalStorage();

			expect(file.entities).toEqual([]);
			expect(file.layers).toHaveLength(1);
			expect(storage[LOCAL_STORAGE_KEY.DRAWING_BACKUP]).toBe('{not json');
		});
	});
});
