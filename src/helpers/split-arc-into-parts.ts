import { Arc } from '@flatten-js/core';

export function splitArcIntoParts(arc: Arc, numberOfParts: number): Arc[] {
	const arcs: Arc[] = [];

	const start = arc.startAngle;
	const ccw = arc.counterClockwise;

	// Total angle span (flatten-js keeps angles normalized, so subtraction is fine)
	const totalSpan = arc.sweep;
	const step = totalSpan / numberOfParts;

	for (let i = 0; i < numberOfParts; i++) {
		const partStart = start + i * step;
		const partEnd = start + (i + 1) * step;

		arcs.push(
			new Arc(
				arc.center, // Point
				arc.r.valueOf(), // number
				partStart, // start angle in radians
				partEnd, // end angle in radians
				ccw // direction
			)
		);
	}

	return arcs;
}
