import type {Point} from '@flatten-js/core';
import type {StartAndEndpointEntity} from '../App.types.ts';
import {isPointEqual} from './is-point-equal.ts';

/**
 * If entities form a closed loop, returns a new array
 * in which each segment’s end meets the next segment’s start.
 * Otherwise returns null.
 */
export function checkClosedPolygon(
	entities: StartAndEndpointEntity[]
): StartAndEndpointEntity[] | null {
	const numberOfEntities = entities.length;
	if (numberOfEntities === 0) return null;

	const uniquePoints: Point[] = [];
	const counts: number[] = [];
	const edges: { startIndex: number; endIndex: number; entityIndex: number }[] = [];

	// find or register point
	const findOrAdd = (point: Point): number => {
		for (let i = 0; i < uniquePoints.length; i++) {
			if (isPointEqual(uniquePoints[i], point)) return i;
		}
		uniquePoints.push(point);
		counts.push(0);
		return uniquePoints.length - 1;
	};

	// 1) build counts & edge‐list
	for (let entityIndex = 0; entityIndex < numberOfEntities; entityIndex++) {
		const entity = entities[entityIndex];
		const entityStartPoint = entity.getStartPoint();
		const entityEndPoint = entity.getEndPoint();
		if (isPointEqual(entityStartPoint, entityEndPoint)) {
			throw new Error('entity with zero length detected');
		} // zero‐length
		const uniquePointIndexStartPoint = findOrAdd(entityStartPoint);
		const uniquePointIndexEndPoint = findOrAdd(entityEndPoint);
		counts[uniquePointIndexStartPoint]++;
		counts[uniquePointIndexEndPoint]++;
		edges.push({
			startIndex: uniquePointIndexStartPoint,
			endIndex: uniquePointIndexEndPoint,
			entityIndex: entityIndex,
		});
	}

	// 2) must have exactly n unique points
	if (uniquePoints.length !== numberOfEntities) {
		throw new Error("number of unique points doesn't match number of entities");
	}

	// 3) each point appears exactly twice
	if (counts.some((count) => count !== 2)) {
		throw new Error("This polyline isn't closed. Some points do not appear twice");
	}

	// 4) build adjacency of vertices
	const ajacentVertexIndexes: number[][] = Array.from({ length: numberOfEntities }, () => []);
	for (const { startIndex, endIndex } of edges) {
		ajacentVertexIndexes[startIndex].push(endIndex);
		ajacentVertexIndexes[endIndex].push(startIndex);
	}

	// 5) degree must be 2 at every vertex
	if (ajacentVertexIndexes.some((neigh) => neigh.length !== 2)) return null;

	// 6) connectivity: simple DFS/BFS
	const seen = new Set<number>();
	const stack = [0];
	while (stack.length) {
		const vertexIndex = stack.pop();
		if (typeof vertexIndex === 'undefined') {
			break;
		}
		if (!seen.has(vertexIndex)) {
			seen.add(vertexIndex);
			for (const w of ajacentVertexIndexes[vertexIndex]) {
				if (!seen.has(w)) stack.push(w);
			}
		}
	}
	if (seen.size !== numberOfEntities) return null;

	// — at this point it *is* a closed loop, so build the ordered chain —
	// map each vertex to its two incident edge‐indexes
	const adjEdges: number[][] = Array.from({ length: numberOfEntities }, () => []);
	edges.forEach((e, idx) => {
		adjEdges[e.startIndex].push(idx);
		adjEdges[e.endIndex].push(idx);
	});

	const usedEdge = new Array(numberOfEntities).fill(false);
	const orderedEntities: StartAndEndpointEntity[] = [];

	// start with edge 0, oriented from start→end
	let currVertexIdx = edges[0].endIndex;
	usedEdge[0] = true;
	orderedEntities.push(entities[edges[0].entityIndex]);

	for (let i = 1; i < numberOfEntities; i++) {
		// pick the other edge at currVertexIdx
		const candidateEdges = adjEdges[currVertexIdx];
		const nextEdgeIdx = candidateEdges.find((idx) => !usedEdge[idx]);
		if (nextEdgeIdx === undefined) {
			// should never happen if checks passed
			return null;
		}

		// grab & orient that entity
		const { startIndex, endIndex, entityIndex } = edges[nextEdgeIdx];
		const ent = entities[entityIndex];

		orderedEntities.push(ent);
		usedEdge[nextEdgeIdx] = true;

		// move along the loop
		currVertexIdx = startIndex === currVertexIdx ? endIndex : startIndex;
	}

	return orderedEntities;
}
