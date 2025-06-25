import {Arc, type Point, Segment} from '@flatten-js/core';
import {uniqWith} from 'es-toolkit';
import {getAngleWithXAxis} from './get-angle-with-x-axis.ts';
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
export function splitAtPoints<T extends Segment | Arc>(
	entity: T,
	points: Point[]
): SplitAtPointsReturn<T> {
	const uniquePoints = uniqWith(points, isPointEqual);

	if (entity instanceof Segment) {
		return splitSegmentAtPoints(entity, uniquePoints) as SplitAtPointsReturn<T>;
	}
	return splitArcAtPoints(entity, uniquePoints) as SplitAtPointsReturn<T>;
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
	const ccw = arc.counterClockwise; // invert===false → CCW, invert===true → CW

	// 1) Make sure all points are unique
	const uniquePoints = uniqWith(splitPoints, isPointEqual);

	// 2) Compute absolute angles of each point around the center, normalize to [0,2π)
	const angles = uniquePoints
		.map((point) => getAngleWithXAxis(center, point))
		.filter((angle) => {
			if (ccw) {
				if (startAngle <= endAngle) return angle > startAngle && angle < endAngle;
				return angle > startAngle || angle < endAngle;
			}
			// clockwise
			if (startAngle >= endAngle) return angle < startAngle && angle > endAngle;
			return angle < startAngle || angle > endAngle;
		})
		// sort in travel order from startAng → endAng
		.sort((firstAngle, secondAngle) => {
			const da = (firstAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
			const db = (secondAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
			return ccw ? da - db : db - da;
		});

	// 3) Build angles array including both ends
	const splitAngles = [startAngle, ...angles, endAngle];

	// 4) Build each sub-arc
	return splitAngles
		.slice(0, -1)
		.map((angle, i) => new Arc(center, radius, angle, splitAngles[i + 1], ccw));
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
