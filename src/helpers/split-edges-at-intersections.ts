import {type Arc, Box, PlanarSet, type Point, type Segment} from '@flatten-js/core';
import {splitEdgeAtPoints} from "./split-edge-at-points.ts";
import {isEqual} from "es-toolkit";

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
	for (const currentEdge of edges) {
		const intersectionCandidates = planarSet.search(
			new Box(
				Math.min(currentEdge.start.x, currentEdge.end.x),
				Math.min(currentEdge.start.y, currentEdge.end.y),
				Math.max(currentEdge.start.x, currentEdge.end.x),
				Math.max(currentEdge.start.y, currentEdge.end.y)
			)
		);
		const intersectionCandidatesWithoutCurrentEdge = intersectionCandidates.filter(
			(edge) => !isEqual(edge, currentEdge)
		);
		const allIntersections: Point[] = [];
		for (const intersectionCandidate of intersectionCandidatesWithoutCurrentEdge) {
			const intersections = currentEdge.intersect(intersectionCandidate);
			allIntersections.push(...intersections);
		}
		const cutEdges = splitEdgeAtPoints(currentEdge, allIntersections);
		allCutEdges.push(...cutEdges);
	}
	return allCutEdges;
}
