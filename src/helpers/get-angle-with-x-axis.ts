import type {Point} from '@flatten-js/core';

/**
 * Calculates the angle between the segment and the x axis in Radians
 * @param start
 * @param end
 */
export function getAngleWithXAxis(start: Point, end: Point): number {
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	let radians = Math.atan2(dy, dx); // Y difference is the first parameter
	if (radians < 0) {
		radians += Math.PI * 2;
	}
	return radians;
}
