import {Arc, Box, Circle, Point, Polygon, Segment, type Shape} from '@flatten-js/core';
import {EPSILON} from '../App.consts.ts';
import type {Edge} from '../App.types.ts';
import {pointDistance} from './distance-between-points.ts';
import {getBoundingBoxOfMultipleEdges} from './get-bounding-box-of-multiple-entities.ts';
import {isPointInsideBoundary} from './is-point-inside-boundary.ts';
import {isPointInsideBox} from './is-point-inside-box.ts';
import {orderEdgeBoundary} from './order-edge-boundary.ts';
import {splitEdgesAtIntersections} from './split-edges-at-intersections.ts';

type VertexKey = string;

interface EdgePoints {
	startPointKey: VertexKey;
	endPointKey: VertexKey;
}

interface EdgeInfo extends EdgePoints {
	shape: Edge;
}

/**
 * Generates a string identifier for a Point
 * @param point
 */
// ...imports stay the same...

function keyOf(point: Point): VertexKey {
	return `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
}

export function findEnclosingBoundary(point: Point, shapes: Shape[]): (Segment | Arc)[] | null {
	const candidates: { boundary: Edge[]; sizeIndicator: number }[] = [];

	const edges: Edge[] = [];
	for (const shape of shapes) {
		let loop: Edge[] | null = null;

		if (shape instanceof Circle && shape.contains(point)) {
			loop = [shape.toArc()];
		} else if (shape instanceof Box && shape.contains(point)) {
			loop = shape.toSegments();
		} else if (shape instanceof Polygon && shape.contains(point)) {
			for (const face of shape.faces) {
				const edges = face.shapes as Edge[];
				const poly = new Polygon(edges);
				if (poly.contains(point)) {
					loop = edges;
					break;
				}
			}
		} else if (
			shape instanceof Arc &&
			(shape as Arc).sweep > Math.PI * 2 - EPSILON &&
			pointDistance((shape as Arc).center, point) < (shape as Arc).r.valueOf()
		) {
			const arc = shape as Arc;
			const equivalentCircle = new Circle(arc.center, arc.r.valueOf());
			if (equivalentCircle.contains(point)) {
				loop = [shape];
			}
		} else if (shape instanceof Segment || shape instanceof Arc) {
			edges.push(shape as Edge);
		}

		if (loop) {
			candidates.push({ boundary: loop, sizeIndicator: calculateSizeIndicator(loop, point) });
			edges.push(...loop);
		}
	}

	const edgeShapes: Edge[] = splitEdgesAtIntersections(edges);

	const edgeInfos: EdgeInfo[] = [];
	const adjEdges: Record<VertexKey, Edge[]> = {};

	for (const shape of edgeShapes) {
		// ★ Use arc.start / arc.end to avoid recompute drift
		const startPoint =
			shape instanceof Segment ? shape.start : shape instanceof Arc ? (shape as Arc).start : null;
		const endPoint =
			shape instanceof Segment ? shape.end : shape instanceof Arc ? (shape as Arc).end : null;

		if (!startPoint || !endPoint) continue;

		const startPointKey = keyOf(startPoint);
		const endPointKey = keyOf(endPoint);

		adjEdges[startPointKey] = (adjEdges[startPointKey] || []).concat(shape);
		adjEdges[endPointKey] = (adjEdges[endPointKey] || []).concat(shape);

		edgeInfos.push({ shape, startPointKey, endPointKey });
	}

	const visited = new Set<Edge>();

	for (const { shape: seed } of edgeInfos) {
		if (visited.has(seed)) continue;

		// flood‐fill component
		const queue: Edge[] = [seed];
		const compEdges = new Set<Edge>();
		const compVerts = new Set<VertexKey>();
		visited.add(seed);

		while (queue.length) {
			const edge = queue.shift() as Edge;
			compEdges.add(edge);
			const info = edgeInfos.find((x) => x.shape === edge);
			if (!info) {
				throw new Error('Failed to find edge during flood fill');
			}
			for (const vk of [info.startPointKey, info.endPointKey]) {
				compVerts.add(vk);
				for (const nbrEdge of adjEdges[vk] || []) {
					if (!visited.has(nbrEdge)) {
						visited.add(nbrEdge);
						queue.push(nbrEdge);
					}
				}
			}
		}

		// ★ Build an edge-aware neighbor accessor (multigraph)
		const edgesByVertex = new Map<VertexKey, { nbr: VertexKey; edge: Edge }[]>();
		for (const e of compEdges) {
			const info = edgeInfos.find((x) => x.shape === e);
			if (!info) {
				throw new Error(
					'Failed to find edge during Build an edge-aware neighbor accessor (multigraph)'
				);
			}
			const a = info.startPointKey;
			const b = info.endPointKey;
			if (!edgesByVertex.has(a)) edgesByVertex.set(a, []);
			if (!edgesByVertex.has(b)) edgesByVertex.set(b, []);
			edgesByVertex.get(a)?.push({ nbr: b, edge: e });
			edgesByVertex.get(b)?.push({ nbr: a, edge: e });
		}

		// ★ Give every edge in this component a stable numeric id for cycle canonicalization
		const edgeId = new Map<Edge, number>();
		{
			let i = 0;
			for (const e of compEdges) edgeId.set(e, i++);
		}
		const addEdgeIds = (edges: Edge[]) =>
			edges
				.map((e) => edgeId.get(e))
				.sort((a, b) => (a || 0) - (b || 0))
				.join('|');

		const allCycles: Edge[][] = [];
		const seenCycles = new Set<string>();

		const inStack = new Set<VertexKey>();
		const visitedDFS = new Set<VertexKey>();
		const parentMap = new Map<VertexKey, { parent: VertexKey | null; via: Edge | null }>();

		function recordCycle(edgesInCycle: Edge[]) {
			const key = addEdgeIds(edgesInCycle);
			if (!seenCycles.has(key)) {
				seenCycles.add(key);
				allCycles.push(edgesInCycle.slice()); // store a copy
			}
		}

		function reconstructCycle(vertexKey1: VertexKey, vertexKey2: VertexKey, closingEdge: Edge) {
			// reconstruct edges from v back to w using parentMap, plus the closing edge v-w
			const path: Edge[] = [closingEdge];
			let cur = vertexKey1;
			while (cur !== vertexKey2) {
				const info = parentMap.get(cur);
				if (!info?.via || info.parent === null) {
					// should not happen in a well-formed back-edge case
					return;
				}
				path.push(info.via);
				cur = info.parent;
			}
			recordCycle(path);
		}

		function dfs(v: VertexKey, parent: VertexKey | null): void {
			inStack.add(v);

			const incident = edgesByVertex.get(v) || [];
			for (const { nbr, edge } of incident) {
				// 2-edge parallel cycle with the parent (multigraph)
				if (nbr === parent) {
					const incoming = parentMap.get(v)?.via;
					if (incoming && incoming !== edge) {
						recordCycle([incoming, edge]);
					}
					// continue scanning other incident edges
					continue;
				}

				if (!visitedDFS.has(nbr) && !inStack.has(nbr)) {
					parentMap.set(nbr, { parent: v, via: edge });
					dfs(nbr, v);
				} else if (inStack.has(nbr)) {
					// Standard back-edge: cycle length ≥ 3
					reconstructCycle(v, nbr, edge);
				}
				// else: nbr already fully processed (cross/forward edge) → ignore
			}

			inStack.delete(v);
			visitedDFS.add(v);
		}

		for (const start of compVerts) {
			if (!visitedDFS.has(start)) {
				parentMap.set(start, { parent: null, via: null });
				dfs(start, null);
			}
		}

		// Emit one candidate per distinct cycle found in this component
		for (const cycleEdges of allCycles) {
			candidates.push({
				boundary: cycleEdges,
				sizeIndicator: calculateSizeIndicator(cycleEdges, point),
			});
		}
	}

	// ★ Actually use the BB filter result
	const bbFiltered = candidates.filter((c) =>
		isPointInsideBox(getBoundingBoxOfMultipleEdges(c.boundary), point)
	);

	const candidatesContainingPoint = bbFiltered.filter((c) =>
		isPointInsideBoundary(c.boundary, point)
	);

	if (candidatesContainingPoint.length === 0) return null;

	candidatesContainingPoint.sort((a, b) => a.sizeIndicator - b.sizeIndicator);
	const boundary = candidatesContainingPoint[0].boundary;

	return orderEdgeBoundary(boundary);
}

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
