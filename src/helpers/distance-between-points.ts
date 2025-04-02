export function pointDistance(point1: { x: number; y: number }, point2: { x: number; y: number }) {
	return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}
