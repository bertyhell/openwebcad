import type {Edge} from "../App.types.ts";
import {Arc, Segment} from "@flatten-js/core";
import {isPointEqual} from "./is-point-equal.ts";
import {isApproxEqual} from "./is-approx-equal.ts";

/**
 * Joins arcs that have the same center point, and share one start/endpoint
 * Joins segments that have the same slope and share one start/endpoint
 * For efficiency the edges already have to be in order. So only i and i+1 will be considered for merging
 * If the edges are not yet in order, you can use the orderEdgeBoundary function
 * @param edges edges to be merged. These can be Arcs and Segments
 */
export function unionEdges(edges: Edge[]): Edge[] {
	if (edges.length <= 1) {
		return edges;
	}

	const mergedEdges: Edge[] = [];

	// First pass: merge along the sequence
	for (const edge of edges) {
		const last = mergedEdges[mergedEdges.length - 1];
		if (!last) {
			mergedEdges.push(edge);
			continue;
		}

		const merged = tryMerge(last, edge);
		if (merged) {
			// Replace last with merged edge
			mergedEdges[mergedEdges.length - 1] = merged;
		} else {
			mergedEdges.push(edge);
		}
	}

	// Optional: if edges form a closed loop, try to merge first and last
	if (mergedEdges.length > 1) {
		const first = mergedEdges[0];
		const last = mergedEdges[mergedEdges.length - 1];
		const closedMerged = tryMerge(last, first);

		if (closedMerged) {
			mergedEdges[0] = closedMerged;
			mergedEdges.pop(); // remove last, it's now merged into first
		}
	}

	return mergedEdges;
}

function tryMerge(edge1: Edge, edge2: Edge): Edge | null {
	if (edge1 instanceof Arc && edge2 instanceof Arc) {
		// Merge arcs if these are equal: center, radius, end with start and ccw
		if (
			isPointEqual(edge1.center, edge2.center) &&
			isApproxEqual(edge1.r.valueOf(), edge2.r.valueOf()) &&
			isPointEqual(edge1.end, edge2.start) &&
			edge1.counterClockwise === edge2.counterClockwise
		) {
			return new Arc(
				edge1.center,
				edge1.r.valueOf(),
				edge1.startAngle,
				edge2.endAngle,
				edge1.counterClockwise
			);
		}
	} else if (edge1 instanceof Segment && edge2 instanceof Segment) {
		// Merge segments if these are equal: slope and end with start
		if (
			isPointEqual(edge1.end, edge2.start) &&
			isApproxEqual(edge1.slope, edge2.slope)
		) {
			return new Segment(edge1.start, edge2.end);
		}
	}

	return null;
}
