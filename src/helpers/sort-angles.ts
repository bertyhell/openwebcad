/**
 * Sorts the given angles from startPoint (angles[0]) in the direction of counterClockWise variable
 * @param angles angles to be sorted, first angle has to be the start angle
 * @param counterClockWise should we go counter clock wise or clock wise?
 * @return list of sorted angles starting with start angle in the given direction (ccw or cw)
 */
export function sortAngles(angles: number[], counterClockWise: boolean): number[] {
	if (angles.length <= 1) return angles.slice();

	const TWO_PI = Math.PI * 2;
	const start = angles[0];

	// Compute wrapped angular distance from `start` in the desired direction.
	const dist = (a: number) => {
		const d = counterClockWise
			? a - start
			: start - a;
		// Wrap to [0, 2π)
		const wrapped = d % TWO_PI;
		return wrapped < 0 ? wrapped + TWO_PI : wrapped;
	};

	// Sort by distance, so start (distance 0) comes first, then around the circle.
	return angles.slice().sort((a, b) => dist(a) - dist(b));
}
