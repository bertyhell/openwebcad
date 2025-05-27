export function toHex(red: number, green: number, blue: number, alpha: number): string {
	return (blue | (green << 8) | (red << 16) | (1 << 24)).toString(16).slice(1) + alpha;
}
