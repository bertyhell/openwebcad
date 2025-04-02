import { Point, type Segment } from '@flatten-js/core';
import type {LineEntity} from "../entities/LineEntity.ts";

export function mirrorPointOverAxis(point: Point, mirrorAxis: LineEntity) {
	const mirrorAxisSegment = mirrorAxis.getShape() as Segment;
	const A = mirrorAxisSegment.start;
	const B = mirrorAxisSegment.end;

	// Compute the vector components for the mirror axis
	const dx = B.x - A.x;
	const dy = B.y - A.y;

	// Compute the projection factor t
	const t = ((point.x - A.x) * dx + (point.y - A.y) * dy) / (dx * dx + dy * dy);

	// Compute the projection of the point onto the line
	const projX = A.x + t * dx;
	const projY = A.y + t * dy;

	// Reflect the point: new point = 2 * projection - original point
	return new Point(2 * projX - point.x, 2 * projY - point.y);
}
