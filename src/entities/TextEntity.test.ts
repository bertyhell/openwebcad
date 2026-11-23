import { Box, Point, Vector } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { TO_RADIANS } from '../App.consts.ts';
import { LineEntity } from './LineEntity.ts';
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

describe('rotated text', () => {
	// 'hello' is about 27.5 wide and 10 high, reading upwards from the base point
	const createUpwardText = () =>
		new TextEntity('hello', new Point(0, 0), {
			fontSize: 10,
			textAlign: 'left',
			textDirection: new Vector(0, 1),
		});

	it('has a bounding box that follows the text direction', () => {
		const boundingBox = createUpwardText().getBoundingBox();
		expect(boundingBox.xmin).toBeCloseTo(-5);
		expect(boundingBox.xmax).toBeCloseTo(5);
		expect(boundingBox.ymin).toBeCloseTo(0);
		expect(boundingBox.ymax).toBeCloseTo(27.5);
	});

	it('is picked where it is drawn, not where horizontal text would be', () => {
		const text = createUpwardText();
		expect(text.distanceTo(new Point(0, 20))?.[0]).toBeCloseTo(0);
		expect(text.distanceTo(new Point(20, 0))?.[0]).toBeCloseTo(15);
	});

	it('is not selected by a box that only overlaps where horizontal text would be', () => {
		const text = createUpwardText();
		expect(text.intersectsWithBox(new Box(15, -2, 25, 2))).toBe(false);
		expect(text.intersectsWithBox(new Box(-1, 10, 1, 12))).toBe(true);
	});
});

describe('mirrored text', () => {
	const verticalAxis = new LineEntity(new Point(0, -10), new Point(0, 10));
	const horizontalAxis = new LineEntity(new Point(-10, 0), new Point(10, 0));

	function expectVector(vector: Vector, x: number, y: number) {
		expect(vector.x).toBeCloseTo(x);
		expect(vector.y).toBeCloseTo(y);
	}

	it('stays readable when it is mirrored over a vertical axis, and ends where the mirrored text starts', () => {
		const text = new TextEntity('hello', new Point(10, 5), { textAlign: 'left', fontSize: 10 });
		text.mirror(verticalAxis);
		const options = text.getOptions();
		expectVector(options.textDirection, 1, 0);
		expect(options.textAlign).toBe('right');
		expect(text.getBasePoint().x).toBeCloseTo(-10);
		expect(text.getBasePoint().y).toBeCloseTo(5);
	});

	it('mirrors the direction of rotated text and keeps it readable', () => {
		const angle = 30 * TO_RADIANS;
		const text = new TextEntity('hello', new Point(10, 5), {
			textDirection: new Vector(Math.cos(angle), Math.sin(angle)),
		});
		text.mirror(verticalAxis);
		expectVector(text.getOptions().textDirection, Math.cos(-angle), Math.sin(-angle));
	});

	it('keeps text that reads upwards reading upwards', () => {
		const text = new TextEntity('hello', new Point(10, 5), { textDirection: new Vector(0, 1) });
		text.mirror(horizontalAxis);
		expectVector(text.getOptions().textDirection, 0, 1);
		expect(text.getBasePoint().y).toBeCloseTo(-5);
	});

	it('keeps the lines of a multi-line text in the mirrored area', () => {
		const text = new TextEntity('first\nsecond', new Point(0, 0), {
			fontSize: 10,
			textAlign: 'left',
		});
		text.mirror(horizontalAxis);
		expectVector(text.getOptions().textDirection, 1, 0);
		expect(text.getOptions().textAlign).toBe('left');
		// The lines were at y = 0 and y = -12.5, the mirrored lines are at y = 12.5 and y = 0
		const [firstLine, secondLine] = text.getLineBasePoints();
		expect(firstLine.y).toBeCloseTo(12.5);
		expect(secondLine.y).toBeCloseTo(0);
	});
});
