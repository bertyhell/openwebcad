import {Arc, Segment} from '@flatten-js/core';
import type {Edge} from '../App.types.ts';
import {isPointEqual} from './is-point-equal.ts';

/**
 * Orders the start and endpoints of a list of edges
 * An edge can be a segment or an arc
 *
 * input:
 * [[p1, p2], [p3, p2], [p3, p4], [p1, p4]]
 *
 * output
 * [[p1, p2], [p2, p3], [p3, p4], [p4, p1]]
 */
export function orderBoundary(boundary: Edge[]) {
	if (boundary.length <= 1) {
		// Empty array or only one item, those are always correctly ordered
		return boundary;
	}
	// For every edge in this boundary, Check if boundary edge end doesn't match next boundary edge start, invert the edge
	const orderedBoundary: Edge[] = [];
	if (
		isPointEqual(boundary[0].start, boundary[1].start) ||
		isPointEqual(boundary[0].start, boundary[1].end)
	) {
		// flip first edge
		orderedBoundary.push(flipEdge(boundary[0]));
	} else {
		orderedBoundary.push(boundary[0]);
	}

	// Flip other edges if needed
	for (let i = 1; i < boundary.length; i++) {
		const previousEdge = orderedBoundary[i - 1];
		const currentEdge = boundary[i];

		if (!isPointEqual(previousEdge.end, currentEdge.start)) {
			orderedBoundary.push(flipEdge(currentEdge));
		} else {
			orderedBoundary.push(currentEdge);
		}
	}
	return orderedBoundary;
}

function flipEdge(edge: Edge): Edge {
	if (edge instanceof Segment) {
		// Flip next segment
		return new Segment(edge.end, edge.start);
	}
	// Flip next arc
	const arc = edge as Arc;
	return new Arc(arc.center, arc.r.valueOf(), arc.endAngle, arc.startAngle, !arc.counterClockwise);
}
