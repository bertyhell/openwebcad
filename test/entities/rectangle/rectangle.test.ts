/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Draw a rectangle to the screen and check if the json export contains the correct data using the vitest testing framework
 */
import {expect, test} from 'vitest';
import {EntityName, type JsonEntity} from '../../../src/entities/Entity';
import type {RectangleJsonData} from '../../../src/entities/RectangleEntity';
import {getEntities} from '../../../src/state';
import {Tool} from '../../../src/tools';
import {click} from '../../helpers/click';
import {initApplication} from '../../helpers/init-application';
import {setActiveTool} from '../../helpers/set-active-tool';
import {CANVAS_HEIGHT} from '../../helpers/tests.consts';

test('Draw circle', async () => {
	const inputController = initApplication();
	setActiveTool(Tool.RECTANGLE);
	click(inputController, 185, 94);
	click(inputController, 740, 395);
	const entities = getEntities();

	const rectangleEntity = entities[0];
	expect(rectangleEntity.getType()).toBe(EntityName.Rectangle);
	const rectangleJson = (await rectangleEntity.toJson()) as JsonEntity<RectangleJsonData>;

	expect(rectangleJson.lineColor).toBe('#fff');
	expect(rectangleJson.lineWidth).toBe(1);
	expect(rectangleJson.type).toBe('Rectangle');
	expect(rectangleJson.shapeData.points[0].x).toBe(185);
	expect(rectangleJson.shapeData.points[0].y).toBe(CANVAS_HEIGHT - 395);

	expect(rectangleJson.shapeData.points[1].x).toBe(185);
	expect(rectangleJson.shapeData.points[1].y).toBe(CANVAS_HEIGHT - 94);

	expect(rectangleJson.shapeData.points[2].x).toBe(740);
	expect(rectangleJson.shapeData.points[2].y).toBe(CANVAS_HEIGHT - 94);

	expect(rectangleJson.shapeData.points[3].x).toBe(740);
	expect(rectangleJson.shapeData.points[3].y).toBe(CANVAS_HEIGHT - 395);
});
