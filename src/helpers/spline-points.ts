import { Point } from '@flatten-js/core';
import { pointDistance } from './distance-between-points.ts';

/**
 * Number of segments between two fit points
 */
const SPLINE_SEGMENTS_PER_SPAN = 16;

/**
 * Points along a centripetal Catmull-Rom spline through the fit points
 * Centripetal splines don't overshoot or form loops between fit points that are close together
 */
export function getSplinePoints(fitPoints: Point[]): Point[] {
	// Remove fit points on top of each other, they don't define a direction
	const points = fitPoints.filter(
		(point, index) => index === 0 || pointDistance(point, fitPoints[index - 1]) > 0
	);
	if (points.length < 3) {
		return points;
	}

	// Mirror the second and second to last point to get a direction at the ends
	const first = new Point(2 * points[0].x - points[1].x, 2 * points[0].y - points[1].y);
	const last = new Point(
		2 * points[points.length - 1].x - points[points.length - 2].x,
		2 * points[points.length - 1].y - points[points.length - 2].y
	);
	const controlPoints = [first, ...points, last];

	const result: Point[] = [points[0]];
	for (let i = 1; i < controlPoints.length - 2; i++) {
		for (let step = 1; step <= SPLINE_SEGMENTS_PER_SPAN; step++) {
			result.push(
				getCatmullRomPoint(
					controlPoints[i - 1],
					controlPoints[i],
					controlPoints[i + 1],
					controlPoints[i + 2],
					step / SPLINE_SEGMENTS_PER_SPAN
				)
			);
		}
	}
	return result;
}

/**
 * Point between p1 and p2 at fraction t, using the Barry and Goldman formulation with alpha 0.5
 */
function getCatmullRomPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
	const knot = (from: number, a: Point, b: Point) => from + Math.sqrt(pointDistance(a, b));
	const t0 = 0;
	const t1 = knot(t0, p0, p1);
	const t2 = knot(t1, p1, p2);
	const t3 = knot(t2, p2, p3);
	const time = t1 + (t2 - t1) * t;

	const lerp = (a: Point, b: Point, ta: number, tb: number) => {
		const weight = tb === ta ? 0 : (time - ta) / (tb - ta);
		return new Point(a.x + (b.x - a.x) * weight, a.y + (b.y - a.y) * weight);
	};
	const a1 = lerp(p0, p1, t0, t1);
	const a2 = lerp(p1, p2, t1, t2);
	const a3 = lerp(p2, p3, t2, t3);
	const b1 = lerp(a1, a2, t0, t2);
	const b2 = lerp(a2, a3, t1, t3);
	return lerp(b1, b2, t1, t2);
}
