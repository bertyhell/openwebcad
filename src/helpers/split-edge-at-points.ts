import {Arc, type Point, Segment} from '@flatten-js/core';
import {uniqWith} from 'es-toolkit';
import {isPointEqual} from './is-point-equal.ts';

type SplitAtPointsReturn<T extends Segment | Arc> = T extends Segment
	? Segment[]
	: T extends Arc
		? Arc[]
		: never;

/**
 * Split a given Segment or Arc at the given points
 * @param entity The Segment or Arc that needs to be split
 * @param points the points that lie on the given entity where the entity needs to be split. These points need to be unique.
 */
export function splitEdgeAtPoints<T extends Segment | Arc>(
	entity: T,
	points: Point[]
): SplitAtPointsReturn<T> {
	if (entity instanceof Segment) {
		return splitSegmentAtPoints(entity, points) as SplitAtPointsReturn<T>;
	}
	return splitArcAtPoints(entity, points) as SplitAtPointsReturn<T>;
}

/**
 * Split an Arc on the given points and returns the Arc segments
 * @param arc the Arc that needs to be split
 * @param splitPoints The points on the arc where to split the arc
 */
export function splitArcAtPoints(arc: Arc, splitPoints: Point[]): Arc[] {
	const center = arc.center;
	const radius = Number(arc.r.valueOf()); // only used for tolerance scaling if needed later
	const startAngle = arc.startAngle;
	const endAngle = arc.endAngle;
	const ccw = arc.counterClockwise;

	const EPS_A = 1e-12;
	const TAU = Math.PI * 2;

	const normA = (a: number) => {
		let t = a % TAU;
		if (t < 0) t += TAU;
		return t;
	};

	// distance (>=0) following direction from a->b
	const sweepSize = (a: number, b: number, dirCCW: boolean) => {
		const na = normA(a);
		const nb = normA(b);
		if (dirCCW) {
			const s = nb - na;
			return s >= 0 ? s : s + TAU;
		} else {
			const s = na - nb;
			return s >= 0 ? s : s + TAU;
		}
	};

	const angleOfPoint = (p: Point) => Math.atan2(p.y - center.y, p.x - center.x);

	const approximatelyEqAngle = (a: number, b: number) => {
		const da = Math.abs(normA(a) - normA(b));
		return da <= EPS_A || Math.abs(da - TAU) <= EPS_A;
	};

	const makeSegment = (a0: number, a1: number): Arc => {
		// Preserve prototype if Arc is a class
		return Object.assign(
			Object.create(Object.getPrototypeOf(arc)),
			arc,
			{ startAngle: a0, endAngle: a1, counterClockwise: ccw }
		) as Arc;
	};

	// Collect and convert split points to angles
	const cutAngles: number[] = [startAngle, endAngle];
	for (const p of splitPoints ?? []) {
		const ang = angleOfPoint(p);

		// avoid duplicates vs. existing cut angles
		let dup = false;
		for (const a of cutAngles) {
			if (approximatelyEqAngle(a, ang)) {
				dup = true;
				break;
			}
		}
		if (!dup) cutAngles.push(ang);
	}

	// Sort by travel distance along the arc direction from startAngle
	const ordered = cutAngles
	.map(a => ({ a, d: sweepSize(startAngle, a, ccw) }))
	.sort((u, v) => u.d - v.d);

	// Deduplicate after sort
	const compact: number[] = [];
	for (const { a } of ordered) {
		if (
			compact.length === 0 ||
			sweepSize(compact[compact.length - 1], a, ccw) > EPS_A
		) {
			compact.push(a);
		}
	}

	// Build segments between consecutive angles
	const segments: Arc[] = [];
	for (let i = 0; i < compact.length - 1; i++) {
		const a0 = compact[i];
		const a1 = compact[i + 1];
		if (sweepSize(a0, a1, ccw) > EPS_A) {
			segments.push(makeSegment(a0, a1));
		}
	}

	// If no actual cuts (e.g., empty input or all duplicates), return the original arc
	return segments.length ? segments : [arc];}

export function splitSegmentAtPoints(segment: Segment, splitPoints: Point[]): Segment[] {
	const splitPointsIncludingEndPoints = [segment.start, ...splitPoints, segment.end];
	const uniqPoints = uniqWith(splitPointsIncludingEndPoints, isPointEqual);

	// Sort points according to the segment direction
	// Sort according to y coordinate, then by x coordinate. Because the sorting algorithm is stable and the points lie on a straight line, this should sort the points correctly.
	const sortedPoints = uniqPoints
		.sort((firstPoint, secondPoint) => firstPoint.y - secondPoint.y)
		.sort((firstPoint, secondPoint) => firstPoint.x - secondPoint.x);

	// Build each sub-segment
	return sortedPoints.slice(0, -1).map((p, i) => new Segment(p, sortedPoints[i + 1]));
}
