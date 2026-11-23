import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CircleEntity } from '../../../src/entities/CircleEntity';
import { getActiveToolActor, getEntities, setEntities } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { ActorEvent } from '../../../src/tools/tool.types';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';

describe('break tool', () => {
	beforeEach(() => {
		initApplication();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('refuses to break a circle at a single point and leaves it alone', () => {
		const circle = new CircleEntity(new Point(0, 0), 10);
		setEntities([circle], true);
		const infoSpy = vi.spyOn(toast, 'info').mockImplementation(() => 0);
		setActiveTool(Tool.BREAK);
		getActiveToolActor()?.start();

		const pointOnCircle = new Point(0, 10);
		getActiveToolActor()?.send({
			type: ActorEvent.MOUSE_CLICK,
			worldMouseLocation: pointOnCircle,
			screenMouseLocation: pointOnCircle,
			holdingCtrl: false,
			holdingShift: false,
		});
		getActiveToolActor()?.send({ type: ActorEvent.ABSOLUTE_POINT_INPUT, value: pointOnCircle });

		expect(getEntities()).toEqual([circle]);
		expect(infoSpy).toHaveBeenCalledWith(
			"A circle can't be broken at a single point, pick two different points"
		);
	});
});
