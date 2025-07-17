import {type Arc, Box, PlanarSet, type Point, type Segment} from '@flatten-js/core';
import {splitEdgeAtPoints} from "./split-edge-at-points.ts";

type Edge = Segment | Arc;

/**
 * Split every segment and arc into smaller segments and arcs at all of their intersection points.
 * Returns a flat array of smaller Segments/Arcs so that no intersection
 * lies in the interior of any returned edge.
 */
export function splitEdgesAtIntersections(edges: Edge[]): Edge[] {
	if (edges.length === 0) {
		return [];
	}
	if (edges.length === 1) {
		// If there's only one edge, return it unchanged
		return [edges[0]];
	}
	const planarSet = new PlanarSet();
	for (const edge of edges) {
		planarSet.add(edge);
	}
	const allCutEdges = [];
	for (const edge of edges) {
		const intersectionCandidates = planarSet.search(
			new Box(
				Math.min(edge.start.x, edge.end.x),
				Math.min(edge.start.y, edge.end.y),
				Math.max(edge.end.x, edge.end.x),
				Math.max(edge.end.y, edge.end.y)
			)
		);
		const allIntersections: Point[] = [];
		for (const intersectionCandidate of intersectionCandidates) {
			const intersections = edge.intersect(intersectionCandidate);
			allIntersections.push(...intersections);
		}
		const cutEdges = splitEdgeAtPoints(edge, allIntersections);
		allCutEdges.push(...cutEdges);
	}
	return allCutEdges;
}
