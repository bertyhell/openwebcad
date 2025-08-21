import {Arc, Box, Circle, Point, Polygon, Segment, type Shape} from '@flatten-js/core';
import {EPSILON} from '../App.consts.ts';
import type {Edge} from '../App.types.ts';
import {pointDistance} from './distance-between-points.ts';
import {getBoundingBoxOfMultipleEdges} from './get-bounding-box-of-multiple-entities.ts';
import {isPointInsideBoundary} from './is-point-inside-boundary.ts';
import {isPointInsideBox} from './is-point-inside-box.ts';
import {orderBoundary} from './order-boundary.ts';
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
function keyOf(point: Point): VertexKey {
	return `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
}

export function findEnclosingBoundary(point: Point, shapes: Shape[]): (Segment | Arc)[] | null {
	// We'll store every candidate loop here, with its computed size.
	const candidates: { boundary: Edge[]; sizeIndicator: number }[] = [];

	// ——— 1) Single closed shapes ———
	const edges: Edge[] = [];
	for (const shape of shapes) {
		let loop: Edge[] | null = null;

		if (shape instanceof Circle && shape.contains(point)) {
			loop = [shape.toArc()];
		} else if (shape instanceof Box && shape.contains(point)) {
			loop = shape.toSegments();
		} else if (shape instanceof Polygon && shape.contains(point)) {
			// polygons in Flatten may have multiple faces; find the face containing the point
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
		} else if (shape instanceof Segment) {
			edges.push(shape);
		} else if (shape instanceof Arc) {
			edges.push(shape);
		}

		if (loop) {
			candidates.push({ boundary: loop, sizeIndicator: calculateSizeIndicator(loop, point) });
			edges.push(...loop);
		}
	}

	const edgeShapes: Edge[] = splitEdgesAtIntersections(edges);

	// ——— 2) Arbitrary cycles among Segments/Arcs ———
	const edgeInfos: EdgeInfo[] = [];
	const adj: Record<VertexKey, Edge[]> = {};

	for (let originalIndex = 0; originalIndex < edgeShapes.length; originalIndex++) {
		const shape = edgeShapes[originalIndex];
		let startPoint: Point;
		let endPoint: Point;
		if (shape instanceof Segment) {
			startPoint = shape.start;
			endPoint = shape.end;
		} else {
			const { center, startAngle, endAngle } = shape as Arc;
			const radius = (shape as Arc).r.valueOf();
			startPoint = new Point(
				center.x + radius * Math.cos(startAngle),
				center.y + radius * Math.sin(startAngle)
			);
			endPoint = new Point(
				center.x + radius * Math.cos(endAngle),
				center.y + radius * Math.sin(endAngle)
			);
		}
		const startPointKey: VertexKey = keyOf(startPoint);
		const endPointKey: VertexKey = keyOf(endPoint);
		adj[startPointKey] = (adj[startPointKey] || []).concat(shape);
		adj[endPointKey] = (adj[endPointKey] || []).concat(shape);
		edgeInfos.push({ shape, startPointKey, endPointKey });
	}

	// Detect loops in the segments/arcs
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
			const edgeInfo = edgeInfos.find((x) => x.shape === edge);
			if (!edgeInfo) {
				continue;
			}
			const { startPointKey, endPointKey } = edgeInfo;
			for (const pointKey of [startPointKey, endPointKey]) {
				compVerts.add(pointKey);
				for (const nbr of adj[pointKey]) {
					if (!visited.has(nbr)) {
						visited.add(nbr);
						queue.push(nbr);
					}
				}
			}
		}

		// Build component graph (undirected)
		const graph = new Map<VertexKey, Set<VertexKey>>();
		for (const edge of compEdges) {
			const edgeInfo = edgeInfos.find((x) => x.shape === edge);
			if (!edgeInfo) {
				continue;
			}
			const { startPointKey, endPointKey } = edgeInfo;
			if (!graph.has(startPointKey)) graph.set(startPointKey, new Set());
			if (!graph.has(endPointKey)) graph.set(endPointKey, new Set());
			graph.get(startPointKey)?.add(endPointKey);
			graph.get(endPointKey)?.add(startPointKey);
		}

		// to hold the one cycle we find
		let cycleEdges: Edge[] = [];

		// keep track of which vertices are in the current recursion stack
		const inStack = new Set<VertexKey>();
		// map each vertex to the edge we traversed to get there + its parent vertex
		const parentMap = new Map<VertexKey, { parent: VertexKey | null; via: Edge | null }>();

		// DFS to detect any cycle
		function depthFirstSearchGraph(v: VertexKey, parent: VertexKey | null): boolean {
			inStack.add(v);

			for (const nbr of graph.get(v) || []) {
				// find the actual Edge that connects v ↔ nbr
				const edge = edgeInfos.find(
					(edgeInfo) =>
						(edgeInfo.startPointKey === v && edgeInfo.endPointKey === nbr) ||
						(edgeInfo.startPointKey === nbr && edgeInfo.endPointKey === v)
				)?.shape;

				if (!edge) continue; // should not happen, but just in case

				if (!inStack.has(nbr)) {
					// tree‐edge
					parentMap.set(nbr, { parent: v, via: edge });
					if (depthFirstSearchGraph(nbr, v)) return true;
				} else if (nbr !== parent) {
					// back‐edge to an ancestor: we’ve found a cycle!
					// walk back from `v` up to `nbr` via parentMap, collecting edges
					const edgesInCycle: Edge[] = [edge]; // close‐edge first
					let cur = v;
					while (cur !== nbr) {
						const info = parentMap.get(cur);
						if (info?.via && info.parent !== null) {
							edgesInCycle.push(info.via);
							cur = info.parent;
						}
					}
					cycleEdges = edgesInCycle;
					return true;
				}
			}

			inStack.delete(v);
			return false;
		}

		// run dfs from each vertex in this set of edges until we find a cycle
		for (const start of graph.keys()) {
			if (!inStack.has(start)) {
				parentMap.set(start, { parent: null, via: null });
				if (depthFirstSearchGraph(start, null)) break;
			}
		}

		if (cycleEdges?.length) {
			candidates.push({
				boundary: cycleEdges,
				sizeIndicator: calculateSizeIndicator(cycleEdges, point),
			});
		}
	}

	// Remove the boundaries for which the bounding box does not contain the point
	const candidatesWithPointInBB: { boundary: Edge[]; sizeIndicator: number }[] = [];
	for (const candidate of candidates) {
		if (isPointInsideBox(getBoundingBoxOfMultipleEdges(candidate.boundary), point)) {
			candidatesWithPointInBB.push(candidate);
		}
	}

	// Remove the boundaries for which the point isn't inside the boundary
	const candidatesContainingPoint = candidatesWithPointInBB.filter((candidate) =>
		isPointInsideBoundary(candidate.boundary, point)
	);

	// ——— pick the smallest candidate ———
	if (candidatesContainingPoint.length === 0) {
		return null;
	}
	candidatesContainingPoint.sort((a, b) => a.sizeIndicator - b.sizeIndicator);
	const boundary = candidatesContainingPoint[0].boundary;

	return orderBoundary(boundary);
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
