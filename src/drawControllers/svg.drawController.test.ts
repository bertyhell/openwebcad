import { Arc, Point } from '@flatten-js/core';
import { describe, expect, it } from 'vitest';
import { SvgDrawController } from './svg.drawController';

function parseArcPath(svgString: string) {
	const match = svgString.match(
		/d="M([-\d.e]+),([-\d.e]+) A[-\d.e]+,[-\d.e]+ 0 ([01]),([01]) ([-\d.e]+),([-\d.e]+)"/
	);
	if (!match) {
		throw new Error(`Not an arc path: ${svgString}`);
	}
	return {
		start: new Point(Number(match[1]), Number(match[2])),
		largeArcFlag: match[3],
		sweepFlag: match[4],
		end: new Point(Number(match[5]), Number(match[6])),
	};
}

function exportArc(arc: Arc) {
	const controller = new SvgDrawController(0, 0, 1000, 1000);
	controller.drawArc(
		arc.center,
		arc.r.valueOf(),
		arc.startAngle,
		arc.endAngle,
		arc.counterClockwise
	);
	const svgPath = controller.export().svgLines.find((line) => line.includes('<path'));
	return { controller, path: parseArcPath(svgPath as string) };
}

describe('SvgDrawController.drawArc', () => {
	// Arcs taken from a logo drawing that exported incorrectly
	const cases: { name: string; arc: Arc; largeArcFlag: string; sweepFlag: string }[] = [
		{
			name: 'large counterclockwise arc',
			arc: new Arc(
				new Point(683.1552578384967, 726.6867646904172),
				66.0839470152158,
				0.16201883512274948,
				5.919405111048474,
				true
			),
			largeArcFlag: '1',
			sweepFlag: '0',
		},
		{
			name: 'small counterclockwise arc',
			arc: new Arc(
				new Point(683.2459825406172, 726.148874285819),
				88.66870381388631,
				5.626028159947936,
				5.94315494194634,
				true
			),
			largeArcFlag: '0',
			sweepFlag: '0',
		},
		{
			name: 'clockwise arc',
			arc: new Arc(
				new Point(703.5636509486445, 758.3838456568822),
				11,
				2.7474653240348417,
				0.586554378636806,
				false
			),
			largeArcFlag: '0',
			sweepFlag: '1',
		},
		{
			name: 'counterclockwise arc with negative angles',
			arc: new Arc(
				new Point(677.846354524673, 698.6645793877124),
				11,
				-2.5048864572065273,
				-0.4055475238960112,
				true
			),
			largeArcFlag: '0',
			sweepFlag: '0',
		},
	];

	for (const { name, arc, largeArcFlag, sweepFlag } of cases) {
		it(`exports a ${name} with the correct endpoints and flags`, () => {
			const { controller, path } = exportArc(arc);
			const expectedStart = controller.worldToTarget(arc.start);
			const expectedEnd = controller.worldToTarget(arc.end);

			expect(path.start.x).toBeCloseTo(expectedStart.x, 6);
			expect(path.start.y).toBeCloseTo(expectedStart.y, 6);
			expect(path.end.x).toBeCloseTo(expectedEnd.x, 6);
			expect(path.end.y).toBeCloseTo(expectedEnd.y, 6);
			expect(path.largeArcFlag).toBe(largeArcFlag);
			expect(path.sweepFlag).toBe(sweepFlag);
		});
	}
});
