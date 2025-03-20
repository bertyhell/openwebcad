/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Draw a rectangle to the screen and check if the json export contains the correct data using the vitest testing framework
 */
import {expect, test} from 'vitest';
import {getEntities} from '../../../src/state';
import {EntityName, JsonEntity} from '../../../src/entities/Entity';
import {initApplication} from '../../helpers/init-application';
import {CANVAS_HEIGHT} from '../../helpers/tests.consts';
import {CircleJsonData} from '../../../src/entities/CircleEntity';
import circleRecording from './circle.recording.json';
import {replayRecording} from '../../helpers/replay-recording';

test('Draw circle', async () => {
    const inputController = initApplication();

    replayRecording(inputController, circleRecording);

    const entities = getEntities();

    expect(entities).toHaveLength(1);

    const circleEntity = entities[0];
    expect(circleEntity.getType()).toBe(EntityName.Circle);
    const circleJson =
        (await circleEntity.toJson()) as JsonEntity<CircleJsonData>;

    expect(circleJson.lineColor).toBe('#fff');
    expect(circleJson.lineWidth).toBe(1);
    expect(circleJson.type).toBe('Circle');
    expect(circleJson.shapeData.center.x).toBe(325);
    expect(circleJson.shapeData.center.y).toBe(CANVAS_HEIGHT - 257);

    const diffX = 424 - 257;
    const diffY = 366 - 325;
    expect(circleJson.shapeData.radius).toBe(
        Math.sqrt(diffX * diffX + diffY * diffY),
    );
});
