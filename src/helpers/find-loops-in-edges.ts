import {uniqWith} from 'es-toolkit';
import {type DiscoveryResult, DiscoveryResultType, PlanarFaceTree} from 'planar-face-discovery';
import type {CycleTree} from 'planar-face-discovery/src/planar-face-tree.ts';
import type {Edge} from '../App.types.ts';
import {isEdgeEqual} from "./is-edge-equal.ts";
import {isPointEqual} from "./is-point-equal.ts";
import {orderEdgeBoundary} from "./order-edge-boundary.ts";

/**
 * Finds all simple loops (cycles) in an undirected edge network.
 * - Edges are treated as bidirectional.
 * - Loops are returned as arrays of EdgeWithId in loop order.
 * - Deduplicates the same loop discovered from different start points/orientations.
 *
 * Notes:
 * - Vertices (Points) are keyed by quantized coordinates to be resilient to tiny FP noise.
 * - A loop must contain at least 3 distinct edges (a triangle or larger).
 */
export function findLoopsInEdges(edges: Edge[]): Edge[][] {
	if (edges.length === 0) {
		return [];
	}

	const uniqueEdges = uniqWith(edges, isEdgeEqual);

	// Move all points to positive XY space
	const edgesInPositiveSpace = uniqueEdges;
	let offsetX = 0;
	let offsetY = 0;
	const minX = Math.min(...uniqueEdges.flatMap((e) => [e.start.x, e.end.x]));
	const minY = Math.min(...uniqueEdges.flatMap((e) => [e.start.y, e.end.y]));
	if (minX < 0 || minY < 0) {
		offsetX = minX < 0 ? -minX : 0;
		offsetY = minY < 0 ? -minY : 0;
		for (let i = 0; i < uniqueEdges.length; i++) {
			edgesInPositiveSpace[i] = uniqueEdges[i].translate(offsetX, offsetY);
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
			[edge.start.x, edge.start.y],
			[edge.end.x, edge.end.y],
		]),
		isPointEqual
	);

	/**
	 * Edges are defined by [source id, target id]
	 */
	const planarSetEdges: Array<[number, number]> = edgesInPositiveSpace.map((edge: Edge) => [
		planarSetNodes.findIndex((p) => isPointEqual(p, [edge.start.x, edge.start.y])),
		planarSetNodes.findIndex((p) => isPointEqual(p, [edge.end.x, edge.end.y])),
	]);

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
	const nonEmptyLoops = loops.filter((loop) => loop.length > 0);

	// Reverse negative coordinate space translation
	for (const loop of nonEmptyLoops) {
		for (let i = 0; i < loop.length; i++) {
			loop[i] = loop[i].translate(-offsetX, -offsetY);
		}
	}

	return nonEmptyLoops;
}

function convertCycleForestToEdgeLoops(
	result: DiscoveryResult,
	nodes: [number, number][],
	edges: Edge[]
): Edge[][] {
	const loops: Edge[][] = [];
	const toProcess: CycleTree[] = result.forest;
	while (toProcess.length) {
		const forest = toProcess.shift();
		if (!forest) continue;

		// Solver gave is the node indexes that form a loop
		// Cycle nodes includes start/endpoint of the loop twice
		const cycleNodes = forest.cycle.map((nodeIndex) => nodes[nodeIndex]);

		// Convert these nodes back to edges with a start and endpoint
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
		const uniqueBoundaryEdges = uniqWith(orderedBoundary, isEdgeEqual);
		loops.push(uniqueBoundaryEdges);

		const newChildren = forest.children.map((childTree) => childTree);
		toProcess.push(...newChildren);
	}
	return loops;
}
