import { Point } from '@flatten-js/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { getActiveToolActor, getEntities } from '../../../src/state';
import { Tool } from '../../../src/tools';
import { getImageEndPointFromWidth } from '../../../src/tools/image-import-tool.helpers';
import { ActorEvent } from '../../../src/tools/tool.types';
import { initApplication } from '../../helpers/init-application';
import { setActiveTool } from '../../helpers/set-active-tool';
import { getToolState, typeNumber, typePoint, typeRelativePoint } from './tool-events';

describe('image import', () => {
	// A 200 x 100 image
	const image = { naturalWidth: 200, naturalHeight: 100 } as HTMLImageElement;

	beforeEach(() => {
		initApplication();
		setActiveTool(Tool.IMAGE_IMPORT);
		getActiveToolActor()?.send({ type: ActorEvent.FILE_SELECTED, image });
	});

	function getImageBoundingBox() {
		const box = getEntities()[0].getBoundingBox();
		return [box.xmin, box.ymin, box.xmax, box.ymax];
	}

	it('goes back to selecting with ESC after picking the file', () => {
		expect(getToolState()).toBe('WAITING_FOR_START_POINT');

		getActiveToolActor()?.send({ type: ActorEvent.ESC });

		expect(getActiveToolActor()?.getSnapshot().context.type).toBe(Tool.SELECT);
	});

	it('accepts a typed second corner', () => {
		typePoint(0, 0);
		typePoint(400, 200);

		expect(getImageBoundingBox()).toEqual([0, 0, 400, 200]);
	});

	it('accepts a typed relative second corner', () => {
		typePoint(10, 10);
		typeRelativePoint(200, 300);

		// The image keeps its aspect ratio inside the rectangle
		expect(getImageBoundingBox()).toEqual([10, 10, 210, 110]);
	});

	it('uses a typed number as the width of the image', () => {
		typePoint(0, 0);
		typeNumber(50, new Point(-100, -100));

		expect(getImageBoundingBox()).toEqual([-50, -25, 0, 0]);
	});

	it('keeps waiting for the second corner when the image would have no size', () => {
		typePoint(0, 0);
		typePoint(100, 0);
		typeNumber(0);
		typeNumber(-10);

		expect(getEntities()).toHaveLength(0);
		expect(getToolState()).toBe('WAITING_FOR_END_POINT');

		typePoint(100, 50);
		expect(getEntities()).toHaveLength(1);
	});

	it('places the image towards the mouse for a typed width', () => {
		const endPoint = getImageEndPointFromWidth(new Point(0, 0), new Point(10, -10), 200, 2);
		expect(endPoint.x).toBeCloseTo(200);
		expect(endPoint.y).toBeCloseTo(-100);
	});
});
