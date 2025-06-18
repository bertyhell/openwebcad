import type {Point} from "@flatten-js/core";
import type {StartAndEndpointEntity} from "../App.types.ts";
import {isPointEqual} from "./is-point-equal.ts";

/**
 * Check if entities form a closed loop polygon
 */
export function isClosedPolygon(entities: StartAndEndpointEntity[]): boolean {
	const uniquePoints: Point[] = [];
	const counts: number[] = [];
	const edges: Array<[number, number]> = [];

	// Helper to find or add a point to uniquePoints, returning its index
	const findOrAdd = (pt: Point): number => {
		for (let i = 0; i < uniquePoints.length; i++) {
			if (isPointEqual(uniquePoints[i], pt)) {
				return i;
			}
		}
		uniquePoints.push(pt);
		counts.push(0);
		return uniquePoints.length - 1;
	};

	// 1) Process each segment
	for (const entity of entities) {
		const start = entity.getStartPoint();
		const end = entity.getEndPoint();

		// 1a) no zero‐length segments
		if (isPointEqual(start, end)) {
			return false;
		}

		const si = findOrAdd(start);
		const ei = findOrAdd(end);

		counts[si]++;
		counts[ei]++;
		edges.push([si, ei]);
	}

	const N = entities.length;

	// 2) must have exactly N unique points
	if (uniquePoints.length !== N) {
		return false;
	}

	// 3) each point must appear exactly twice
	if (counts.some((c) => c !== 2)) {
		return false;
	}

	// 4) build undirected adjacency
	const adj: number[][] = Array.from({ length: N }, () => []);
	for (const [u, v] of edges) {
		adj[u].push(v);
		adj[v].push(u);
	}

	// 5) each vertex must have degree 2
	if (adj.some((neigh) => neigh.length !== 2)) {
		return false;
	}

	// 6) connectivity: traverse from 0
	const visited = new Set<number>();
	const stack = [0];
	while (stack.length) {
		const u = stack.pop();
		if (typeof u === 'undefined') {
			break;
		}
		if (!visited.has(u)) {
			visited.add(u);
			for (const v of adj[u]) {
				if (!visited.has(v)) stack.push(v);
			}
		}
	}

	return visited.size === N;
}
