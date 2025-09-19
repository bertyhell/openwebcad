import type {Point} from '@flatten-js/core';
import type {StartAndEndpointEntity} from '../App.types.ts';
import {isPointEqual} from './is-point-equal.ts';
import {orderEntityBoundary} from './order-edge-boundary.ts';

/**
 * If entities form a closed loop, returns a new array
 * in which each segment’s end meets the next segment’s start.
 * Otherwise, returns null.
 */
export function checkClosedPolygon(
	entities: StartAndEndpointEntity[]
): StartAndEndpointEntity[] | null {
	if (entities.length === 0) {
		return null;
	}
	let toProcess = entities.slice(1);
	const closedLoop = [entities[0]];
	let nextEntity: StartAndEndpointEntity | null = null;
	do {
		const previousEndPoint = closedLoop.at(-1)?.getEndPoint() as Point;
		nextEntity =
			toProcess.find(
				(entity) =>
					isPointEqual(entity.getStartPoint(), previousEndPoint) ||
					isPointEqual(entity.getEndPoint(), previousEndPoint)
			) || null;
		if (nextEntity) {
			// Remove nextEntity from toProcess list
			toProcess = toProcess.filter((toProcessEdge) => toProcessEdge.id !== nextEntity?.id);
			// Add next entity to closed loop list
			closedLoop.push(nextEntity);
		}
	} while (nextEntity && toProcess.length > 0);

	if (toProcess.length > 0) {
		return null; // Not a closed loop
	}

	// Check endpoint of closedLoop is equal to startPoint
	if (
		!isPointEqual(
			closedLoop[0].getStartPoint(),
			(closedLoop.at(-1) as StartAndEndpointEntity).getEndPoint()
		)
	) {
		return null;
	}

	return orderEntityBoundary(closedLoop) as StartAndEndpointEntity[];
}
