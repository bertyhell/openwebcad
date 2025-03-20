/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Draw a rectangle to the screen and check if the json export contains the correct data using the vitest testing framework
 */
import {expect, test} from 'vitest';
import {getEntities} from '../../../src/state';
import {Tool} from '../../../src/tools';
import {EntityName, JsonEntity} from '../../../src/entities/Entity';
import {initApplication} from '../../helpers/init-application';
import {CANVAS_HEIGHT} from '../../helpers/tests.consts';
import {click} from '../../helpers/click';
import {LineJsonData} from '../../../src/entities/LineEntity';
import {setActiveTool} from '../../helpers/set-active-tool';

test('Draw line', async () => {
    const inputController = initApplication();
    setActiveTool(Tool.LINE);
    click(inputController, 185, 94);
    click(inputController, 740, 395);
    const entities = getEntities();

    const lineEntity = entities[0];
    expect(lineEntity.getType()).toBe(EntityName.Line);
    const lineJson = (await lineEntity.toJson()) as JsonEntity<LineJsonData>;

    expect(lineJson.lineColor).toBe('#fff');
    expect(lineJson.lineWidth).toBe(1);
    expect(lineJson.type).toBe('Line');
    expect(lineJson.shapeData.startPoint.x).toBe(185);
    expect(lineJson.shapeData.startPoint.y).toBe(CANVAS_HEIGHT - 94);
    expect(lineJson.shapeData.endPoint.x).toBe(740);
    expect(lineJson.shapeData.endPoint.y).toBe(CANVAS_HEIGHT - 395);
});
