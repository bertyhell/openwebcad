import {uniqWith} from 'es-toolkit';
import {type DiscoveryResult, DiscoveryResultType, PlanarFaceTree} from 'planar-face-discovery';
import type {CycleTree} from 'planar-face-discovery/src/planar-face-tree.ts';
import type {Edge} from '../App.types.ts';
import {isEdgeEqual} from "./is-edge-equal.ts";
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
	const planarSetNodes: Array<[number, number]> = uniqWith(
		edgesInPositiveSpace.flatMap((edge) => [
			[edge.start.x, edge.start.y],
			[edge.end.x, edge.end.y],
		]),
		(point1, point2) => point1[0] === point2[0] && point1[1] === point2[1]
	);

	/**
	 * Edges are defined by [source id, target id]
	 */
	const planarSetEdges: Array<[number, number]> = edgesInPositiveSpace.map((edge: Edge) => [
		planarSetNodes.findIndex((p) => p[0] === edge.start.x && p[1] === edge.start.y),
		planarSetNodes.findIndex((p) => p[0] === edge.end.x && p[1] === edge.end.y),
	]);

	const result = solver.discover(planarSetNodes, planarSetEdges);

	// console.log(JSON.stringify(result, null, 2));

	if (result.type === DiscoveryResultType.ERROR) {
		throw new Error(`Failed to find loops in edges: ${result.reason}`);
	}

	const loops = convertCycleForestToEdgeLoops(result, edgesInPositiveSpace);
	const nonEmptyLoops = loops.filter((loop) => loop.length > 0);

	// Reverse negative coordinate space translation
	for (const loop of nonEmptyLoops) {
		for (let i = 0; i < loop.length; i++) {
			loop[i] = loop[i].translate(-offsetX, -offsetY);
		}
	}

	console.log(JSON.stringify(nonEmptyLoops, null, 2));
	return nonEmptyLoops;
}

function convertCycleForestToEdgeLoops(result: DiscoveryResult, edges: Edge[]): Edge[][] {
	const loops: Edge[][] = [];
	const toProcess: CycleTree[] = result.forest;
	while (toProcess.length) {
		const forest = toProcess.shift();
		if (!forest) continue;

		const cycleEdges = forest.cycle.map((edgeIndex) => edges[edgeIndex]);

		const orderedBoundary = orderEdgeBoundary(cycleEdges);
		const uniqueBoundaryEdges = uniqWith(orderedBoundary, isEdgeEqual);
		loops.push(uniqueBoundaryEdges);

		const newChildren = forest.children.map((childTree) => childTree);
		toProcess.push(...newChildren);
	}
	return loops;
}
