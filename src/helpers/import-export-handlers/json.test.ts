import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_STORAGE_KEY } from '../../App.types.ts';
import { CircleEntity } from '../../entities/CircleEntity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { getActiveLayerId, getEntities, getLayers } from '../../state.ts';
import { createTestLayer, resetState } from '../../test-helpers/reset-state.ts';
import { exportEntitiesAndLayersToJsonString } from './json.export.ts';
import {
	getDefaultActiveLayerId,
	getEntitiesAndLayersFromJsonString,
	importEntitiesFromJsonFile,
} from './json.import.ts';
import { importEntitiesAndLayersFromLocalStorage } from './local-storage.import.ts';

vi.mock('react-toastify', () => ({
	toast: { error: vi.fn(), info: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
// Zooming needs the canvas of the screen
vi.mock('../../tools/zoom-tool.helpers.ts', () => ({ zoomToBounds: vi.fn() }));

beforeEach(() => {
	vi.clearAllMocks();
});

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

async function createDrawingJson(): Promise<string> {
	const hiddenLayer = createTestLayer('hidden', { isVisible: false });
	const lockedLayer = createTestLayer('locked', { isLocked: true });
	const editableLayer = createTestLayer('editable');
	const line = new LineEntity(new Point(0, 0), new Point(10, 0));
	line.layerId = editableLayer.id;
	resetState([hiddenLayer, lockedLayer, editableLayer], [line]);
	return exportEntitiesAndLayersToJsonString();
}

describe('json import of layers', () => {
	it('adds a layer for entities whose layer is missing, so they are drawn and can be selected', async () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.layerId = 'deleted';
		const circle = new CircleEntity(new Point(5, 5), 2);
		circle.layerId = 'deleted';
		resetState([createTestLayer('walls', { name: 'Walls' })], [line, circle]);

		const file = await getEntitiesAndLayersFromJsonString(
			await exportEntitiesAndLayersToJsonString()
		);

		expect(file.layers.map((layer) => layer.id)).toEqual(['walls', 'deleted']);
		const recoveredLayer = file.layers[1];
		expect(recoveredLayer.isVisible).toBe(true);
		expect(recoveredLayer.isLocked).toBe(false);
		expect(recoveredLayer.name).not.toBe('Walls');
		expect(file.entities.map((entity) => entity.layerId)).toEqual(['deleted', 'deleted']);
	});

	it('picks the first visible and unlocked layer to draw on', () => {
		const layers = [
			createTestLayer('hidden', { isVisible: false }),
			createTestLayer('locked', { isLocked: true }),
			createTestLayer('editable'),
		];
		expect(getDefaultActiveLayerId(layers)).toBe('editable');
		expect(getDefaultActiveLayerId(layers.slice(0, 2))).toBe('hidden');
	});
});

describe('json file import', () => {
	it('loads the drawing and draws on the first visible and unlocked layer', async () => {
		const json = await createDrawingJson();
		resetState([createTestLayer('other')]);

		await importEntitiesFromJsonFile(new File([json], 'drawing.json'));

		expect(getEntities()).toHaveLength(1);
		expect(getLayers().map((layer) => layer.id)).toEqual(['hidden', 'locked', 'editable']);
		expect(getActiveLayerId()).toBe('editable');
	});

	it.each([
		['malformed json', '{"entities": ['],
		['json without a drawing', '{"name": "not a drawing"}'],
	])('shows an error and keeps the drawing for %s', async (_, contents) => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		resetState([createTestLayer('layer')], [line]);

		await importEntitiesFromJsonFile(new File([contents], 'broken.json'));

		expect(toast.error).toHaveBeenCalled();
		expect(getEntities()).toEqual([line]);
	});

	it('settles when no file is chosen', async () => {
		await expect(importEntitiesFromJsonFile(undefined)).resolves.toBeUndefined();
	});
});

describe('local storage import', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('draws on the first visible and unlocked layer', async () => {
		const json = await createDrawingJson();
		const storage = new Map([[LOCAL_STORAGE_KEY.DRAWING as string, json]]);
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
		});
		resetState([createTestLayer('other')]);

		await importEntitiesAndLayersFromLocalStorage();

		expect(getActiveLayerId()).toBe('editable');
	});
});
