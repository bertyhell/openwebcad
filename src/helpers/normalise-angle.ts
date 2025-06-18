export function normaliseAngleRadians(angle: number): number {
	return (angle + 2 * Math.PI) % (2 * Math.PI);
}
