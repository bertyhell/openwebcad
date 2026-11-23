import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	activateLayer,
	deleteLayer,
	getFirstEditableLayer,
	toggleLayerLock,
	toggleLayerVisibility,
} from '../../src/components/sidebar/sidebar.actions';
import { getActiveLayerId, getLayers } from '../../src/state';
import { createTestLayer, resetState } from '../../src/test-helpers/reset-state';

vi.mock('react-toastify', () => ({
	toast: Object.assign(vi.fn(), {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	}),
}));

describe('active layer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('making a layer active', () => {
		beforeEach(() => {
			resetState([
				createTestLayer('visible'),
				createTestLayer('hidden', { isVisible: false }),
				createTestLayer('locked', { isLocked: true }),
			]);
		});

		it('refuses a hidden layer and tells the user', () => {
			expect(activateLayer('hidden')).toBe(false);

			expect(getActiveLayerId()).toBe('visible');
			expect(toast.info).toHaveBeenCalledWith('Show layer hidden to draw on it');
		});

		it('refuses a locked layer and tells the user', () => {
			expect(activateLayer('locked')).toBe(false);

			expect(getActiveLayerId()).toBe('visible');
			expect(toast.info).toHaveBeenCalledWith('Unlock layer locked to draw on it');
		});

		it('makes a visible and unlocked layer active', () => {
			resetState([createTestLayer('first'), createTestLayer('second')]);

			expect(activateLayer('second')).toBe(true);

			expect(getActiveLayerId()).toBe('second');
		});
	});

	describe('hiding or locking the active layer', () => {
		it('moves the active layer to a layer that can be drawn on', () => {
			resetState([createTestLayer('first'), createTestLayer('second')]);

			toggleLayerVisibility('first');

			expect(getActiveLayerId()).toBe('second');
			expect(toast.warn).not.toHaveBeenCalled();
		});

		it('tells the user when the hidden active layer is the only layer', () => {
			resetState([createTestLayer('only')]);

			toggleLayerVisibility('only');

			expect(getActiveLayerId()).toBe('only');
			expect(toast.warn).toHaveBeenCalledWith('Layer only is hidden, show it to see what you draw');
		});

		it('tells the user when the locked active layer is the only layer', () => {
			resetState([createTestLayer('only')]);

			toggleLayerLock('only');

			expect(toast.warn).toHaveBeenCalledWith(
				'Layer only is locked, unlock it to change what you draw'
			);
		});
	});

	describe('deleting the active layer', () => {
		it('makes a layer that can be drawn on active', () => {
			resetState([
				createTestLayer('active'),
				createTestLayer('hidden', { isVisible: false }),
				createTestLayer('visible'),
			]);

			deleteLayer('active');

			expect(getLayers().map((layer) => layer.id)).toEqual(['hidden', 'visible']);
			expect(getActiveLayerId()).toBe('visible');
		});

		it('tells the user when only hidden layers are left', () => {
			resetState([createTestLayer('active'), createTestLayer('hidden', { isVisible: false })]);

			deleteLayer('active');

			expect(getActiveLayerId()).toBe('hidden');
			expect(toast.warn).toHaveBeenCalledWith(
				'Layer hidden is hidden, show it to see what you draw'
			);
		});
	});

	it('picks the first layer that can be drawn on when the drawing is loaded', () => {
		const layers = [
			createTestLayer('hidden', { isVisible: false }),
			createTestLayer('locked', { isLocked: true }),
			createTestLayer('editable'),
		];

		expect(getFirstEditableLayer(layers)?.id).toBe('editable');
		expect(getFirstEditableLayer([layers[0]])?.id).toBe('hidden');
	});
});
