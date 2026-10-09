import {type Arc, Point, Segment} from '@flatten-js/core';

type Edge = Segment | Arc;

/**
 * approximate boundary size via its axis-aligned bounding‐box area
 */
export function getBoundingBoxArea(boundary: Edge[]): number {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const shape of boundary) {
		const pts: Point[] = [];

		if (shape instanceof Segment) {
			pts.push(shape.start, shape.end);
		} else {
			// sample just the two arc endpoints
			const { center, startAngle, endAngle } = shape as Arc;
			const radius = (shape as Arc).r.valueOf();
			pts.push(
				new Point(
					center.x + radius * Math.cos(startAngle),
					center.y + radius * Math.sin(startAngle)
				),
				new Point(center.x + radius * Math.cos(endAngle), center.y + radius * Math.sin(endAngle))
			);
		}

		for (const p of pts) {
			if (p.x < minX) minX = p.x;
			if (p.y < minY) minY = p.y;
			if (p.x > maxX) maxX = p.x;
			if (p.y > maxY) maxY = p.y;
		}
	}

	return (maxX - minX) * (maxY - minY);
}
