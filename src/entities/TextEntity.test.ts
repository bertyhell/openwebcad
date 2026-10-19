import { Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { TextEntity } from './TextEntity.ts';

describe('TextEntity', () => {
	it('puts every line of a multi-line text below the previous line', () => {
		const text = new TextEntity('first\nsecond line', new Point(0, 0), {
			fontSize: 10,
			textAlign: 'left',
		});
		expect(text.getLines()).toEqual(['first', 'second line']);
		const [firstBasePoint, secondBasePoint] = text.getLineBasePoints();
		expect(firstBasePoint.y).toBeCloseTo(0);
		expect(secondBasePoint.x).toBeCloseTo(0);
		expect(secondBasePoint.y).toBeCloseTo(-12.5);
		const boundingBox = text.getBoundingBox();
		expect(boundingBox.ymin).toBeCloseTo(-17.5);
		expect(boundingBox.xmax).toBeCloseTo(10 * 0.55 * 'second line'.length);
	});

	it('can change its label', () => {
		const text = new TextEntity('old', new Point(0, 0));
		text.setLabel('new');
		expect(text.getLabel()).toBe('new');
	});
});
