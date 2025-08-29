import {Arc, type Point, Segment} from '@flatten-js/core';
import {uniqWith} from 'es-toolkit';
import {EPSILON} from "../App.consts.ts";
import {isApproxEqual} from "./is-approx-equal.ts";
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
	const radius = arc.r.valueOf();
	const startAngle = arc.startAngle;
	const endAngle = arc.endAngle;
	const ccw = arc.counterClockwise;
	const TAU = Math.PI * 2;

	const normalizeAngle = (angle: number) => {
		let t = angle % TAU;
		if (t < 0) t += TAU;
		return t;
	};

	/**
	 * Get sweep size between angles
	 * Expects normalized angles
	 * distance (>=0) following direction from a->b
	 * @param normalizedStartAngle
	 * @param normalizedEndAngle
	 * @param counterClockWise
	 */
	const sweepSize = (
		normalizedStartAngle: number,
		normalizedEndAngle: number,
		counterClockWise: boolean
	) => {
		if (counterClockWise) {
			const sweepAngle = normalizedEndAngle - normalizedStartAngle;
			return sweepAngle >= 0 ? sweepAngle : sweepAngle + TAU;
		}
		const sweepAngle = normalizedStartAngle - normalizedEndAngle;
		return sweepAngle >= 0 ? sweepAngle : sweepAngle + TAU;
	};

	const angleOfPoint = (point: Point) => {
		return Math.atan2(point.y - center.y, point.x - center.x);
	};

	// Collect and convert split points to angles
	const cutAngles: number[] = [startAngle, endAngle];
	for (const splitPoint of [arc.start, ...splitPoints, arc.end]) {
		const angle = normalizeAngle(angleOfPoint(splitPoint));

		// avoid duplicates vs. existing cut angles
		let isDuplicate = false;
		for (const cutAngle of cutAngles) {
			if (isApproxEqual(cutAngle, angle)) {
				isDuplicate = true;
				break;
			}
		}
		if (!isDuplicate) cutAngles.push(angle);
	}

	// Sort by travel distance along the arc direction from startAngle
	const orderedAngles = cutAngles.sort((firstAngle, secondAngle) => firstAngle - secondAngle);

	// Deduplicate after sort
	const partAngles: number[] = [];
	for (const cutAngle of orderedAngles) {
		if (
			partAngles.length === 0 ||
			sweepSize(partAngles[partAngles.length - 1], cutAngle, ccw) > EPSILON
		) {
			partAngles.push(cutAngle);
		}
	}

	// Build segments between consecutive angles
	const arcParts: Arc[] = [];
	for (let i = 0; i < partAngles.length - 1; i++) {
		const startAngle = partAngles[i];
		const endAngle = partAngles[i + 1];
		if (sweepSize(startAngle, endAngle, ccw) > EPSILON) {
			arcParts.push(new Arc(center, radius, startAngle, endAngle, ccw));
		}
	}

	// If no actual cuts (e.g., empty input or all duplicates), return the original arc
	return arcParts.length ? arcParts : [arc];
}

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
