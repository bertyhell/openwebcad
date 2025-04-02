import type {Polygon, Segment} from '@flatten-js/core';

export function polygonToSegments(polygon: Polygon): Segment[] {
	const segments: Segment[] = [];
	for (const edge of polygon.edges) {
		segments.push(edge.shape);
	}
	return segments;
}
