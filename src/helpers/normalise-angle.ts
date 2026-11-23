/**
 * The same angle between 0 and 2π
 */
export function normaliseAngleRadians(angle: number): number {
	return ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}
