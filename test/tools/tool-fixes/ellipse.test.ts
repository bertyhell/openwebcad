import { beforeEach, describe, expect, it } from 'vitest';
import { getEntities } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { click, getToolState, typeNumber, typePoint } from './tool-events';

describe('ellipse', () => {
	beforeEach(() => {
		initApplication();
		setActiveTool(Tool.ELLIPSE);
		typePoint(0, 0);
		typePoint(100, 0);
	});

	it('keeps the center and the first axis when the second axis has no length', () => {
		click(50, 0);
		typeNumber(0);

		expect(getEntities()).toHaveLength(0);
		expect(getToolState()).toBe('WAITING_FOR_SECOND_AXIS');

		click(50, 40);
		expect(getEntities()).toHaveLength(1);
		expect(getToolState()).toBe('WAITING_FOR_CENTER');
	});
});
