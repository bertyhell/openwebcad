import {Arc, Point, Segment} from '@flatten-js/core';
import type {Edge} from '../App.types.ts';
import {pointDistance} from './distance-between-points.ts';

// TODO replace this calculation with a cheap area calculation, since distances to vertices isn't always a valid heuristic
/**
 * Calculates the average of the distances from the center point to the edges in the boundary.
 * For arcs, we also include one extra midpoint to account for the curvature.
 */
export function calculateSizeIndicator(edges: Edge[], centerPoint: Point): number {
	if (edges.length === 0) {
		throw new Error('Cannot calculate size indicator for an empty boundary.');
	}
	let totalDist = 0;
	let sampleCount = 0;

	for (const edge of edges) {
		if (edge instanceof Segment) {
			// sample the two endpoints of the segment
			totalDist += pointDistance(centerPoint, edge.start);
			totalDist += pointDistance(centerPoint, edge.end);
			sampleCount += 2;
		} else if (edge instanceof Arc) {
			const arc = edge as Arc;
			const r = arc.r.valueOf();
			const { center, startAngle, endAngle, counterClockwise, sweep } = arc;

			// sample the two arc endpoints
			const startPt = new Point(
				center.x + r * Math.cos(startAngle),
				center.y + r * Math.sin(startAngle)
			);
			const endPt = new Point(center.x + r * Math.cos(endAngle), center.y + r * Math.sin(endAngle));
			totalDist += pointDistance(centerPoint, startPt);
			totalDist += pointDistance(centerPoint, endPt);
			sampleCount += 2;

			// sample the midpoint along the arc
			const midAngle = counterClockwise ? startAngle + sweep / 2 : startAngle - sweep / 2;
			const midPt = new Point(center.x + r * Math.cos(midAngle), center.y + r * Math.sin(midAngle));
			totalDist += pointDistance(centerPoint, midPt);
			sampleCount += 1;
		}
	}

	// if there were no edges, return something large so this loop won't be chosen
	return totalDist / sampleCount;
}
