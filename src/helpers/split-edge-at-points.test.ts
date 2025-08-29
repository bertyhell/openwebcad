import {Arc, Point} from '@flatten-js/core';
import {describe, it} from 'vitest';
import {splitArcAtPoints, splitEdgeAtPoints} from './split-edge-at-points.ts';
import {expectIsEqualNumberArray} from "./tests/expect-is-equal-number-array.ts";

describe('SplitEdgeAtPoints', () => {
	it('Should split Arc edge into 4 parts', () => {
		const edge = new Arc(new Point(-70, 0), 140, -1.5707963267948966, 1.5707963267948966, true);
		const intersections = [new Point(60.76696830622021, -50), new Point(60.76696830622021, 50)];
		const parts = splitEdgeAtPoints(edge, intersections);
		const arcSweeps = parts.map((arc) => (arc as Arc).sweep);
		expectIsEqualNumberArray(
			arcSweeps,
			// biome-ignore lint/suspicious/noApproximativeNumericConstant: this is coincidence that the number is equal to pi
			[1.9360035480852633, 1.2055891055045298, 3.141592653589793, 1.2055891055045294]
		);
	});

	it('Should split a circle arc into 9 parts', () => {
		const arc = new Arc(new Point(0, 0), 1, 0, Math.PI * 2, true);
		const intersections = [
			new Point(-0.526782687642637, -0.85),
			new Point(0.526782687642637, -0.85),
			new Point(-0.85, -0.526782687642637),
			new Point(-0.85, 0.526782687642637),
			new Point(0.85, -0.526782687642637),
			new Point(0.85, 0.526782687642637),
			new Point(0.526782687642637, 0.85),
			new Point(-0.526782687642637, 0.85),
		];
		const parts = splitArcAtPoints(arc, intersections);
		const arcSweeps = parts.map((arc) => (arc as Arc).sweep);
		expectIsEqualNumberArray(
			arcSweeps,
			[
				0.5548110329800715, 0.46117426083475355, 1.1096220659601435, 0.4611742608347531,
				1.109622065960143, 0.4611742608347531, 1.109622065960143, 0.46117426083475443,
				0.5548110329800711,
			]
		);
	});
});
