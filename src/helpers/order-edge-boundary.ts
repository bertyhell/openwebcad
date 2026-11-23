import { Arc, type Point, Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import type { Edge, StartAndEndpointEntity } from '../App.types.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { copyEntityBaseProperties } from './copy-entity-base-properties.ts';
import { isPointEqual } from './is-point-equal.ts';

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

/**
 * Copy of the line or arc that runs in the opposite direction, with the same style and layer
 */
function flipEntity(entity: StartAndEndpointEntity): StartAndEndpointEntity {
	if (entity instanceof LineEntity) {
		// Flip next segment
		return copyEntityBaseProperties(
			entity,
			new LineEntity(entity.getEndPoint(), entity.getStartPoint())
		);
	}
	// Flip next arc
	const arc = entity.getShape() as Arc;
	return copyEntityBaseProperties(
		entity,
		new ArcEntity(arc.center, arc.r.valueOf(), arc.endAngle, arc.startAngle, !arc.counterClockwise)
	);
}

/**
 * Orders and orients connected lines and arcs, so every segment starts where the previous one ends
 * An open chain starts at one of its free ends. Segments that don't connect are appended at the end
 */
export function chainSegments(segments: StartAndEndpointEntity[]): StartAndEndpointEntity[] {
	if (segments.length <= 1) {
		return segments;
	}
	const connectionCount = (point: Point) =>
		segments.filter(
			(segment) =>
				isPointEqual(segment.getStartPoint(), point) || isPointEqual(segment.getEndPoint(), point)
		).length;

	// Start at a free end, so an open chain isn't split in two
	const remaining = [...segments];
	const firstIndex = Math.max(
		0,
		remaining.findIndex(
			(segment) =>
				connectionCount(segment.getStartPoint()) === 1 ||
				connectionCount(segment.getEndPoint()) === 1
		)
	);
	let first = remaining.splice(firstIndex, 1)[0];
	if (connectionCount(first.getStartPoint()) !== 1 && connectionCount(first.getEndPoint()) === 1) {
		first = flipEntity(first);
	}
	const chain = [first];

	while (remaining.length) {
		const currentEnd = chain[chain.length - 1].getEndPoint();
		const nextIndex = remaining.findIndex(
			(segment) =>
				isPointEqual(segment.getStartPoint(), currentEnd) ||
				isPointEqual(segment.getEndPoint(), currentEnd)
		);
		if (nextIndex === -1) {
			break;
		}
		const next = remaining.splice(nextIndex, 1)[0];
		chain.push(isPointEqual(next.getStartPoint(), currentEnd) ? next : flipEntity(next));
	}
	return [...chain, ...remaining];
}

interface OrientedSegment {
	/** The segment as it was passed in */
	original: StartAndEndpointEntity;
	/** The segment or a flipped copy of it, so it follows the direction of the chain */
	oriented: StartAndEndpointEntity;
}

function touchesPoint(segment: StartAndEndpointEntity, point: Point): boolean {
	return isPointEqual(segment.getStartPoint(), point) || isPointEqual(segment.getEndPoint(), point);
}

/**
 * Grows a chain from the first segment in both directions, by adding the remaining segments that connect to one of its ends
 * The segments that are added to the chain are removed from the remaining segments
 */
function growChain(
	first: StartAndEndpointEntity,
	remaining: StartAndEndpointEntity[]
): OrientedSegment[] {
	const chain: OrientedSegment[] = [{ original: first, oriented: first }];
	while (remaining.length) {
		const chainStart = chain[0].oriented.getStartPoint();
		const chainEnd = (chain.at(-1) as OrientedSegment).oriented.getEndPoint();
		if (chain.length > 1 && isPointEqual(chainStart, chainEnd)) {
			// The chain is a closed loop, nothing else can be attached to it
			break;
		}
		const nextIndex = remaining.findIndex((segment) => touchesPoint(segment, chainEnd));
		if (nextIndex !== -1) {
			const next = remaining.splice(nextIndex, 1)[0];
			chain.push({
				original: next,
				oriented: isPointEqual(next.getStartPoint(), chainEnd) ? next : flipEntity(next),
			});
			continue;
		}
		const previousIndex = remaining.findIndex((segment) => touchesPoint(segment, chainStart));
		if (previousIndex === -1) {
			break;
		}
		const previous = remaining.splice(previousIndex, 1)[0];
		chain.unshift({
			original: previous,
			oriented: isPointEqual(previous.getEndPoint(), chainStart) ? previous : flipEntity(previous),
		});
	}
	return chain;
}

/**
 * Joins lines and arcs that connect end to end into one chain, like the JOIN command in AutoCAD
 * Every segment of the chain starts where the previous one ends
 * When the segments form several separate chains, the chain with the most segments is used,
 * the segments of the other chains are returned as unconnected
 */
export function joinConnectedSegments(segments: StartAndEndpointEntity[]): {
	chain: StartAndEndpointEntity[];
	unconnected: StartAndEndpointEntity[];
} {
	const remaining = [...segments];
	let longestChain: OrientedSegment[] = [];
	while (remaining.length) {
		const chain = growChain(remaining.shift() as StartAndEndpointEntity, remaining);
		if (chain.length > longestChain.length) {
			longestChain = chain;
		}
	}
	const joinedSegments = new Set(longestChain.map((segment) => segment.original));
	return {
		chain: longestChain.map((segment) => segment.oriented),
		unconnected: segments.filter((segment) => !joinedSegments.has(segment)),
	};
}
