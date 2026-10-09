import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	createLayer,
	deleteLayer,
	moveSelectionToLayer,
	renameLayer,
	selectEntitiesOnLayer,
	toggleLayerLock,
	toggleLayerVisibility,
} from './components/sidebar/sidebar.actions.ts';
import { LineEntity } from './entities/LineEntity.ts';
import { createStack } from './helpers/undo-stack.ts';
import {
	addEntities,
	getActiveLayerId,
	getEditableEntities,
	getEntities,
	getLayers,
	getSelectedEntityIds,
	getVisibleEntities,
	redo,
	setActiveLayerId,
	setSelectedEntityIds,
	undo,
} from './state.ts';
import { createTestLayer, resetState } from './test-helpers/reset-state.ts';

function createLineOnLayer(layerId: string): LineEntity {
	const line = new LineEntity(new Point(0, 0), new Point(10, 10));
	line.layerId = layerId;
	line.lineColor = '#ff0000';
	return line;
}

describe('undo and redo with layers', () => {
	beforeEach(() => {
		resetState([createTestLayer('layer-1'), createTestLayer('layer-2')]);
	});

	it('brings back a deleted layer together with its entities', () => {
		const lineOnLayer1 = createLineOnLayer('layer-1');
		const lineOnLayer2 = createLineOnLayer('layer-2');
		addEntities([lineOnLayer1, lineOnLayer2], true);
		setActiveLayerId('layer-2');

		deleteLayer('layer-2');

		expect(getLayers().map((layer) => layer.id)).toEqual(['layer-1']);
		expect(getEntities()).toEqual([lineOnLayer1]);
		expect(getActiveLayerId()).toBe('layer-1');

		undo();

		expect(getLayers().map((layer) => layer.id)).toEqual(['layer-1', 'layer-2']);
		expect(getEntities()).toEqual([lineOnLayer1, lineOnLayer2]);

		redo();

		expect(getLayers().map((layer) => layer.id)).toEqual(['layer-1']);
		expect(getEntities()).toEqual([lineOnLayer1]);
	});

	it('keeps the last layer', () => {
		deleteLayer('layer-1');
		deleteLayer('layer-2');
		expect(getLayers()).toHaveLength(1);
	});

	it('makes moving the selection to another layer undoable', () => {
		const line = createLineOnLayer('layer-1');
		addEntities([line], true);
		setSelectedEntityIds([line.id]);

		expect(moveSelectionToLayer('layer-2')).toBe(1);

		const movedLine = getEntities()[0];
		expect(movedLine.layerId).toBe('layer-2');
		expect(movedLine.id).toBe(line.id);
		expect(movedLine.lineColor).toBe('#ff0000');
		// The original entity is not mutated, so the undo history stays correct
		expect(line.layerId).toBe('layer-1');

		undo();
		expect(getEntities()[0].layerId).toBe('layer-1');
	});

	it('undoes creating and renaming layers', () => {
		createLayer();
		expect(getLayers()).toHaveLength(3);
		expect(getLayers()[2].name).toBe('Layer 3');

		renameLayer('layer-1', '  Walls  ');
		expect(getLayers()[0].name).toBe('Walls');

		undo();
		expect(getLayers()[0].name).toBe('layer-1');
		undo();
		expect(getLayers()).toHaveLength(2);
	});

	it('ignores empty layer names', () => {
		renameLayer('layer-1', '   ');
		expect(getLayers()[0].name).toBe('layer-1');
	});
});

describe('hidden and locked layers', () => {
	const lineOnLayer1 = createLineOnLayer('layer-1');
	const lineOnLayer2 = createLineOnLayer('layer-2');

	beforeEach(() => {
		resetState(
			[createTestLayer('layer-1'), createTestLayer('layer-2')],
			[lineOnLayer1, lineOnLayer2]
		);
	});

	it('excludes entities on hidden layers from the visible and editable entities', () => {
		toggleLayerVisibility('layer-2');
		expect(getVisibleEntities()).toEqual([lineOnLayer1]);
		expect(getEditableEntities()).toEqual([lineOnLayer1]);
	});

	it('excludes entities on locked layers from the editable entities only', () => {
		toggleLayerLock('layer-2');
		expect(getVisibleEntities()).toEqual([lineOnLayer1, lineOnLayer2]);
		expect(getEditableEntities()).toEqual([lineOnLayer1]);
	});

	it('deselects entities when their layer gets locked', () => {
		setSelectedEntityIds([lineOnLayer1.id, lineOnLayer2.id]);
		toggleLayerLock('layer-2');
		expect(getSelectedEntityIds()).toEqual([lineOnLayer1.id]);
	});

	it('does not select entities on a locked layer', () => {
		toggleLayerLock('layer-2');
		expect(selectEntitiesOnLayer('layer-2')).toBe(0);
	});

	it('moves the active layer away from a hidden layer', () => {
		toggleLayerVisibility('layer-1');
		expect(getActiveLayerId()).toBe('layer-2');
	});

	it('returns the same list while nothing changes, so it can be used as a cache key', () => {
		expect(getVisibleEntities()).toBe(getVisibleEntities());
	});
});

describe('undo stack', () => {
	it('forgets the oldest states when the maximum is reached', () => {
		const stack = createStack(3);
		for (let index = 0; index < 5; index++) {
			stack.push({ entities: [], layers: [createTestLayer(`layer-${index}`)] });
		}
		expect(stack.size()).toBe(3);
		expect(stack.peek()?.layers[0].id).toBe('layer-4');
		stack.undo();
		stack.undo();
		expect(stack.peek()?.layers[0].id).toBe('layer-2');
		// The first state can't be undone
		stack.undo();
		expect(stack.peek()?.layers[0].id).toBe('layer-2');
	});
});
