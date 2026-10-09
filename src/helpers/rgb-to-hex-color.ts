/**
 * Converts red, green and blue values from 0 to 255 to a css hex color. eg: 255, 0, 0 => #ff0000
 */
export function toHex(red: number, green: number, blue: number): string {
	return `#${[red, green, blue]
		.map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
		.join('')}`;
}

/**
 * Converts a css hex color to red, green and blue values from 0 to 255. eg: #f00 => [255, 0, 0]
 */
export function fromHex(color: string): [number, number, number] {
	let hex = color.replace('#', '');
	if (hex.length === 3) {
		hex = [...hex].map((char) => char + char).join('');
	}
	const value = Number.parseInt(hex.slice(0, 6), 16) || 0;
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
