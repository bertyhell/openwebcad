import {Arc, Segment} from '@flatten-js/core';
import type {Edge, StartAndEndpointEntity} from '../App.types.ts';
import {ArcEntity} from '../entities/ArcEntity.ts';
import {LineEntity} from '../entities/LineEntity.ts';
import {isPointEqual} from './is-point-equal.ts';
import {compact} from "es-toolkit";

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
export function orderEdgeBoundary(boundary: Edge[]) {
	const compactedBoundary = compact(boundary);
	if (compactedBoundary.length <= 1) {
		// Empty array or only one item, those are always correctly ordered
		return compactedBoundary;
	}
	let remainingEdges = compactedBoundary.slice(1);
	// For every edge in this boundary, Check if boundary edge end doesn't match next boundary edge start, invert the edge
	const orderedBoundary: Edge[] = [];
	orderedBoundary.push(compactedBoundary[0]);

	// Find and flip other edges if needed
	while (remainingEdges.length > 0) {
		const previousEdge = orderedBoundary.at(-1) as Edge;
		const currentEdgeIndex = remainingEdges.findIndex(
			(edge) =>
				isPointEqual(edge.start, previousEdge.end) || isPointEqual(edge.end, previousEdge.end)
		);
		const currentEdge = remainingEdges[currentEdgeIndex];

		if (currentEdgeIndex === -1) {
			throw new Error(
				`Order boundary that isn't a self closing loop. Cannot find edge with ${JSON.stringify(boundary)}`
			);
		}

		remainingEdges = remainingEdges.filter((_edge, index) => index !== currentEdgeIndex);
		if (isPointEqual(previousEdge.end, currentEdge.start)) {
			orderedBoundary.push(currentEdge);
		} else {
			orderedBoundary.push(flipEdge(currentEdge));
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

/**
 * Orders the start and endpoints of a list of entities
 *
 * input:
 * [[p1, p2], [p3, p2], [p3, p4], [p1, p4]]
 *
 * output
 * [[p1, p2], [p2, p3], [p3, p4], [p4, p1]]
 */
export function orderEntityBoundary(boundary: StartAndEndpointEntity[]): StartAndEndpointEntity[] {
	if (boundary.length <= 1) {
		// Empty array or only one item, those are always correctly ordered
		return boundary;
	}
	// For every edge in this boundary, Check if boundary edge end doesn't match next boundary edge start, invert the edge
	const orderedBoundary: StartAndEndpointEntity[] = [];
	if (
		isPointEqual(boundary[0].getStartPoint(), boundary[1].getStartPoint()) ||
		isPointEqual(boundary[0].getStartPoint(), boundary[1].getEndPoint())
	) {
		// flip first edge
		orderedBoundary.push(flipEntity(boundary[0]));
	} else {
		orderedBoundary.push(boundary[0]);
	}

	// Flip other edges if needed
	for (let i = 1; i < boundary.length; i++) {
		const previousEdge = orderedBoundary[i - 1];
		const currentEdge = boundary[i];

		if (!isPointEqual(previousEdge.getEndPoint(), currentEdge.getStartPoint())) {
			orderedBoundary.push(flipEntity(currentEdge));
		} else {
			orderedBoundary.push(currentEdge);
		}
	}
	return orderedBoundary;
}

function flipEntity(entity: StartAndEndpointEntity): StartAndEndpointEntity {
	if (entity instanceof LineEntity) {
		// Flip next segment
		return new LineEntity(entity.getEndPoint(), entity.getStartPoint());
	}
	// Flip next arc
	const arc = entity.getShape() as Arc;
	return new ArcEntity(
		arc.center,
		arc.r.valueOf(),
		arc.endAngle,
		arc.startAngle,
		!arc.counterClockwise
	);
}
