import {Point} from '@flatten-js/core'; /* eslint-disable @typescript-eslint/no-explicit-any */
import {expect, test} from 'vitest';
import type {ArcJsonData} from '../../../src/entities/ArcEntity';
import {EntityName, type JsonEntity} from '../../../src/entities/Entity';
import type {LineJsonData} from '../../../src/entities/LineEntity';
import {pointDistance} from '../../../src/helpers/distance-between-points';
import {getEntities} from '../../../src/state';
import {initApplication} from '../../helpers/init-application';
import {replayRecording} from '../../helpers/replay-recording';
import {CANVAS_HEIGHT} from "../../helpers/tests.consts";
import eraserRecording from './eraser.recording.json';

test('Draw circle and line and erase part of circle', async () => {
	const inputController = initApplication();

	replayRecording(inputController, eraserRecording);

	const entities = getEntities();

	expect(entities).toHaveLength(2);

	const lineEntity = entities[0];
	expect(lineEntity.getType()).toBe(EntityName.Line);
	const lineJson = (await lineEntity.toJson()) as JsonEntity<LineJsonData>;

	expect(lineJson.lineColor).toBe('#fff');
	expect(lineJson.lineWidth).toBe(1);
	expect(lineJson.type).toBe('Line');
	expect(lineJson.shapeData.startPoint.x).toBe(473);
	expect(lineJson.shapeData.startPoint.y).toBe(CANVAS_HEIGHT - 148);
	expect(lineJson.shapeData.endPoint.x).toBe(473);
	expect(lineJson.shapeData.endPoint.y).toBe(CANVAS_HEIGHT - 698);

	const arcEntity = entities[1];
	expect(arcEntity.getType()).toBe(EntityName.Arc);
	const arcJson = (await arcEntity.toJson()) as JsonEntity<ArcJsonData>;

	expect(arcJson.lineColor).toBe('#fff');
	expect(arcJson.lineWidth).toBe(1);
	expect(arcJson.type).toBe('Arc');
	expect(arcJson.shapeData.center.x).toBe(266);
	expect(arcJson.shapeData.center.y).toBe(CANVAS_HEIGHT - 402);
	const radius = pointDistance(
		new Point(266, CANVAS_HEIGHT - 402),
		new Point(542, CANVAS_HEIGHT - 441)
	);
	expect(arcJson.shapeData.radius).toBeCloseTo(radius, 5);
	expect(arcJson.shapeData.startAngle).toBeCloseTo(-0.7338182524767606, 5);
	expect(arcJson.shapeData.endAngle).toBeCloseTo(0.7338182524767606, 5);
});
