import {Arc, Box, Circle, Point, Polygon, Segment, type Shape} from '@flatten-js/core';
import {EPSILON} from '../App.consts.ts';
import {pointDistance} from "./distance-between-points.ts";
import {getBoundingBoxArea} from './getBoundingBoxArea.ts';
import {isPointEqual} from "./is-point-equal.ts";
import {splitEdgesAtIntersections} from "./split-edges-at-intersections.ts";

type Edge = Segment | Arc;

interface EdgePoints {
	startPointKey: string;
	endPointKey: string;
}

interface EdgeInfo extends EdgePoints {
	shape: Edge;
}

/**
 * Generates a string identifier for a Point
 * @param point
 */
function keyOf(point: Point) {
	return `${point.x.toFixed(6)},${point.y.toFixed(6)}`;
}

export function findEnclosingBoundary(point: Point, shapes: Shape[]): (Segment | Arc)[] | null {
	// We'll store every candidate loop here, with its computed size.
	const candidates: { boundary: Edge[]; size: number }[] = [];

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
			candidates.push({ boundary: loop, size: getBoundingBoxArea(loop) });
			edges.push(...loop);
		}
	}

	const edgeShapes: Edge[] = splitEdgesAtIntersections(edges);

	// ——— 2) Arbitrary cycles among Segments/Arcs ———
	const edgeInfos: EdgeInfo[] = [];
	const adj: Record<string, Edge[]> = {};

	for (const shape of edgeShapes) {
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
		const startPointKey = keyOf(startPoint);
		const endPointKey = keyOf(endPoint);
		adj[startPointKey] = (adj[startPointKey] || []).concat(shape);
		adj[endPointKey] = (adj[endPointKey] || []).concat(shape);
		edgeInfos.push({ shape, startPointKey, endPointKey });
	}

	const visited = new Set<Edge>();

	for (const { shape: seed } of edgeInfos) {
		if (visited.has(seed)) continue;

		// flood‐fill component
		const queue: Edge[] = [seed];
		const compEdges = new Set<Edge>();
		const compVerts = new Set<string>();
		visited.add(seed);

		while (queue.length) {
			const edge = queue.shift() as Edge;
			compEdges.add(edge);
			const { startPointKey, endPointKey } = edgeInfos.find((x) => x.shape === edge) as EdgeInfo;
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

		// check “simple cycle” criteria
		let isCycle = true;
		for (const v of compVerts) {
			const deg = adj[v].filter((e) => compEdges.has(e)).length;
			if (deg !== 2) {
				isCycle = false;
				break;
			}
		}
		if (!isCycle || compEdges.size !== compVerts.size) continue;

		// order into a loop
		const endpoints = new Map<Edge, EdgePoints>();
		for (const edgeInfo of edgeInfos) {
			if (compEdges.has(edgeInfo.shape)) {
				endpoints.set(edgeInfo.shape, {
					startPointKey: edgeInfo.startPointKey,
					endPointKey: edgeInfo.endPointKey,
				});
			}
		}

		const loop: Edge[] = [];
		const [first] = compEdges;
		let currKey = (endpoints.get(first) as EdgePoints).endPointKey;
		loop.push(first);
		const unused = new Set(compEdges);
		unused.delete(first);

		while (unused.size) {
			const next = adj[currKey].find((e) => unused.has(e)) as Edge;
			loop.push(next);
			unused.delete(next);
			const { startPointKey, endPointKey } = endpoints.get(next) as EdgePoints;
			currKey = startPointKey === currKey ? endPointKey : startPointKey;
		}

		// test containment
		try {
			const poly = new Polygon(loop);
			if (poly.contains(point)) {
				candidates.push({ boundary: loop, size: getBoundingBoxArea(loop) });
			}
		} catch {
			// in case of arc‐only loops that Polygon() can’t handle,
			// fallback to unordered test
			const poly2 = new Polygon(Array.from(compEdges));
			if (poly2.contains(point)) {
				candidates.push({
					boundary: Array.from(compEdges),
					size: getBoundingBoxArea(Array.from(compEdges)),
				});
			}
		}
	}

	// ——— pick the smallest candidate ———
	if (candidates.length === 0) return null;
	candidates.sort((a, b) => a.size - b.size);
	const boundary = candidates[0].boundary;

	// For every edge in this boundary, Check if boundary edge end doesn't match next boundary edge start, invert the edge
	for (let i = 0; i < boundary.length; i++) {
		const currentEdge = boundary[i];
		const nextEdge = boundary[(i + 1) % boundary.length];

		if (!isPointEqual(currentEdge.end, nextEdge.start)) {
			if (nextEdge instanceof Segment) {
				// Flip next segment
				boundary[(i + 1) % boundary.length] = new Segment(nextEdge.end, nextEdge.start);
			} else {
				// Flip next arc
				const arc = nextEdge as Arc;
				boundary[(i + 1) % boundary.length] = new Arc(
					arc.center,
					arc.r.valueOf(),
					arc.endAngle,
					arc.startAngle,
					!arc.counterClockwise
				);
			}
		}
	}
	return boundary;
}
