import {Polygon} from '@flatten-js/core';
import type {Edge} from '../App.types.ts';

/**
 * Calculates the area of the boundary
 */
export function calculateArea(edges: Edge[]): number {
	if (edges.length === 0) {
		return 0;
	}

	const polygon = new Polygon(edges);

	return polygon.area();
}
