import { Arc, Segment } from '@flatten-js/core';
import { compact, uniqWith } from 'es-toolkit';
import { reverse } from 'es-toolkit/compat';
import { type DiscoveryResult, DiscoveryResultType, PlanarFaceTree } from 'planar-face-discovery';
import type { CycleTree } from 'planar-face-discovery/src/planar-face-tree.ts';
import { ARC_SEGMENTS_FOR_LOOPS_CHECK } from '../App.consts.ts';
import type { Edge } from '../App.types.ts';
import type { BoundaryWithHoles } from './find-loops-in-edges.types.ts';
import { isEdgeEqual } from './is-edge-equal.ts';
import { isPointEqual } from './is-point-equal.ts';
import { orderEdgeBoundary } from './order-edge-boundary.ts';
import { splitArcIntoParts } from './split-arc-into-parts.ts';
import { unionEdges } from './union-edges.ts';

/**
 * Finds all simple loops (cycles) in an undirected edge network.
 * - Edges cannot intersect. If they do, use splitEdgesAtIntersections function first
 * - Edges are treated as bidirectional.
 * - Loops are returned as arrays of EdgeWithId in loop order.
 * - Deduplicates the same loop discovered from different start points/orientations.
 *
 * Notes:
 * - Vertices (Points) are keyed by quantized coordinates to be resilient to tiny FP noise.
 * - A loop must contain at least 3 distinct edges (a triangle or larger).
 *
 * @returns loops with holes in order of smallest boundary per island, so you can find the smallest boundary that includes a point
 * eg:
 *  A                            D                    F
 *  |--------------------|       |-------------|      |----|
 *  |    B               |       |             |      |    |
 *  |    |-----------|   |       |   E         |      |----|
 *  |    |           |   |       |   |-----|   |
 *  |    |   C       |   |       |   |     |   |
 *  |    |   |----|  |   |       |   |-----|   |
 *  |    |   |    |  |   |       |             |
 *  |    |   |----|  |   |       |-------------|
 *  |    |           |   |
 *  |    |-----------|   |
 *  |                    |
 *  |                    |
 *  |                    |
 *  |--------------------|
 *
 *  This function will guarantee
 *   * that C B A are outputted in this order
 *   * that E and D are outputted in this order
 *
 *  The order of the islands (A, D, F) is indeterminate
 */
export function findLoopsInEdges(edges: Edge[]): BoundaryWithHoles[] {
	if (edges.length === 0) {
		return [];
	}

	const uniqueEdges1 = uniqWith(edges, isEdgeEqual);

	const uniqueEdges2 = compact(
		uniqueEdges1.flatMap((edge: Edge): Edge[] | null => {
			if (edge instanceof Segment) {
				return [edge];
			} else if (edge instanceof Arc) {
				return splitArcIntoParts(edge, ARC_SEGMENTS_FOR_LOOPS_CHECK);
			} else {
				return null;
			}
		})
	);

	// Move all points to positive XY space
	const edgesInPositiveSpace = uniqueEdges2;
	let offsetX = 0;
	let offsetY = 0;
	const minX = Math.min(...uniqueEdges2.flatMap((e) => [e.start.x, e.end.x]));
	const minY = Math.min(...uniqueEdges2.flatMap((e) => [e.start.y, e.end.y]));
	if (minX < 0 || minY < 0) {
		offsetX = minX < 0 ? -minX : 0;
		offsetY = minY < 0 ? -minY : 0;
		for (let i = 0; i < uniqueEdges2.length; i++) {
			edgesInPositiveSpace[i] = uniqueEdges2[i].translate(offsetX, offsetY);
		}
	}

	const solver = new PlanarFaceTree();

	/**
	 * Each node is defined by its [X,Y] position.
	 * The coordinate system is oriented as such
	 *
	 *  +y
	 *   |
	 *   |
	 *   |
	 *   |__________ +x
	 *
	 * That is you should have your nodes exist in positive
	 * XY space only, negative positions are not allowed.
	 *
	 * The index in the array defines the nodes "id"
	 */
	const planarSetNodes: [number, number][] = uniqWith(
		edgesInPositiveSpace.flatMap((edge) => [
			[Math.max(edge.start.x, 0), Math.max(edge.start.y, 0)],
			[Math.max(edge.end.x, 0), Math.max(edge.end.y, 0)],
		]),
		isPointEqual
	);

	/**
	 * Edges are defined by [source id, target id]
	 */
	let planarSetEdges: [number, number][] = edgesInPositiveSpace.map((edge: Edge) => [
		planarSetNodes.findIndex((p) => isPointEqual(p, [edge.start.x, edge.start.y])),
		planarSetNodes.findIndex((p) => isPointEqual(p, [edge.end.x, edge.end.y])),
	]);
	planarSetEdges = uniqWith(
		planarSetEdges,
		(edge1Indexes, edge2Indexes) =>
			(edge1Indexes[0] === edge2Indexes[0] && edge1Indexes[1] === edge2Indexes[1]) ||
			(edge1Indexes[0] === edge2Indexes[1] && edge1Indexes[1] === edge2Indexes[0])
	);

	const result = solver.discover(planarSetNodes, planarSetEdges);

	// console.log(JSON.stringify(result, null, 2));

	if (result.type === DiscoveryResultType.ERROR) {
		throw new Error(`Failed to find loops in edges: ${result.reason}`);
	}

	if (result.forest.length === 0) {
		// No loops found
		return [];
	}

	const loops = convertCycleForestToEdgeLoops(result, planarSetNodes, edgesInPositiveSpace);
	const nonEmptyLoops = loops.filter((loop) => loop.boundary.length > 0);

	// Reverse negative coordinate space translation
	for (const loop of nonEmptyLoops) {
		for (let i = 0; i < loop.boundary.length; i++) {
			// Translate coordinates of the boundary
			loop.boundary[i] = loop.boundary[i].translate(-offsetX, -offsetY);

			// Translate coordinates of the holes
			for (const childLoop of loop.holes) {
				childLoop[i] = childLoop[i].translate(-offsetX, -offsetY);
			}
		}
	}

	return reverse(nonEmptyLoops) || [];
}

function convertCycleNodesToEdges(
	cycleTree: CycleTree,
	nodes: [number, number][],
	edges: Edge[]
): Edge[] {
	const cycleNodes = cycleTree.cycle.map((nodeIndex) => nodes[nodeIndex]);
	const cycleEdges: Edge[] = [];
	// Loop start/endpoint is included twice in the nodelist, so we can just walk over the list to get all edges
	// No need to wrap around with module %
	for (let i = 0; i < cycleNodes.length - 1; i++) {
		const startCycleNode = cycleNodes[i];
		const endCycleNode = cycleNodes[i + 1];
		const edgeFromCycleNodes = edges.find((edge) => {
			// Find edge that has same startpoint and endpoint or same endpoint and startpoint
			return (
				(isPointEqual(edge.start, startCycleNode) && isPointEqual(edge.end, endCycleNode)) ||
				(isPointEqual(edge.end, startCycleNode) && isPointEqual(edge.start, endCycleNode))
			);
		});
		if (!edgeFromCycleNodes) {
			throw new Error(
				JSON.stringify({
					message: 'Failed to find edge from cycle nodes',
					additionalInfo: { cycleNodes, firstNode: cycleNodes[i], secondNode: cycleNodes[i + 1] },
				})
			);
		}
		cycleEdges.push(edgeFromCycleNodes);
	}
	const orderedBoundary = orderEdgeBoundary(cycleEdges);
	const unionBoundary = unionEdges(orderedBoundary);
	return uniqWith(unionBoundary, isEdgeEqual);
}

function convertCycleForestToEdgeLoops(
	result: DiscoveryResult,
	nodes: [number, number][],
	edges: Edge[]
): BoundaryWithHoles[] {
	const loops: BoundaryWithHoles[] = [];
	const toProcess: CycleTree[] = result.forest;
	while (toProcess.length) {
		const forest = toProcess.shift();
		if (!forest) continue;

		// Solver gave is the node indexes that form a loop
		// Cycle nodes includes start/endpoint of the loop twice
		// Convert these nodes back to edges with a start and endpoint
		const cycleEdges = convertCycleNodesToEdges(forest, nodes, edges);

		const childCycleEdges: Edge[][] = forest.children.map((child: CycleTree) => {
			return convertCycleNodesToEdges(child, nodes, edges);
		});

		loops.push({
			boundary: cycleEdges,
			holes: childCycleEdges,
		});

		const newChildren = forest.children.map((childTree) => childTree);
		toProcess.push(...newChildren);
	}
	return loops;
}
