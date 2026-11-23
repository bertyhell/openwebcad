import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import type { DrawController } from '../drawControllers/DrawController.ts';
import { ArcEntity } from './ArcEntity.ts';
import { LineEntity } from './LineEntity.ts';
import { PolyLineEntity } from './PolyLineEntity.ts';

function createRecordingDrawController() {
	const calls: { name: string; args: unknown[] }[] = [];
	const record =
		(name: string) =>
		(...args: unknown[]) => {
			calls.push({ name, args });
		};
	const drawController = {
		setLineStyles: record('setLineStyles'),
		drawLine: record('drawLine'),
		drawArc: record('drawArc'),
	} as unknown as DrawController;
	return { calls, drawController };
}

describe('PolyLineEntity', () => {
	it('draws its segments in its own style without changing the segments', () => {
		const line = new LineEntity(new Point(0, 0), new Point(10, 0));
		line.lineColor = '#ff0000';
		line.lineWidth = 1;
		line.layerId = 'line-layer';
		const arc = new ArcEntity(new Point(10, 5), 5, -Math.PI / 2, Math.PI / 2, true);
		const polyLine = new PolyLineEntity([line, arc]);
		polyLine.lineColor = '#00ff00';
		polyLine.lineWidth = 4;
		polyLine.lineDash = [4, 2];
		polyLine.layerId = 'polyline-layer';

		const { calls, drawController } = createRecordingDrawController();
		polyLine.draw(drawController, false, false);

		// The segments that are shared with other code keep their own style
		expect(line.lineColor).toBe('#ff0000');
		expect(line.lineWidth).toBe(1);
		expect(line.lineDash).toBeUndefined();
		expect(line.layerId).toBe('line-layer');

		const styleCalls = calls.filter((call) => call.name === 'setLineStyles');
		expect(styleCalls.length).toBeGreaterThan(0);
		for (const styleCall of styleCalls) {
			expect(styleCall.args).toEqual([false, false, '#00ff00', 4, [4, 2]]);
		}
		expect(calls.filter((call) => call.name === 'drawLine')).toHaveLength(1);
		expect(calls.filter((call) => call.name === 'drawArc')).toHaveLength(1);
	});
});
