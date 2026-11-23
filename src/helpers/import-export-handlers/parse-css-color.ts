import { toHex } from '../rgb-to-hex-color.ts';

/**
 * Common css color names, other names aren't recognized since the import also runs outside the browser in tests
 */
const NAMED_COLORS: Record<string, string> = {
	black: '#000000',
	white: '#ffffff',
	red: '#ff0000',
	lime: '#00ff00',
	green: '#008000',
	blue: '#0000ff',
	yellow: '#ffff00',
	cyan: '#00ffff',
	aqua: '#00ffff',
	magenta: '#ff00ff',
	fuchsia: '#ff00ff',
	gray: '#808080',
	grey: '#808080',
	silver: '#c0c0c0',
	maroon: '#800000',
	olive: '#808000',
	navy: '#000080',
	purple: '#800080',
	teal: '#008080',
	orange: '#ffa500',
};

/**
 * Converts a css color to a hex color, eg: rgb(100%, 0%, 0%) => #ff0000
 * Returns null for colors that aren't recognized, and for none
 */
export function parseCssColor(color: string): string | null {
	const value = color.trim().toLowerCase();
	if (NAMED_COLORS[value]) {
		return NAMED_COLORS[value];
	}
	const hexMatch = value.match(/^#([0-9a-f]{3,8})$/);
	if (hexMatch) {
		const hex = hexMatch[1];
		if (hex.length === 3 || hex.length === 4) {
			return `#${[...hex.slice(0, 3)].map((char) => char + char).join('')}`;
		}
		if (hex.length === 6 || hex.length === 8) {
			return `#${hex.slice(0, 6)}`;
		}
		return null;
	}
	const rgbMatch = value.match(/^rgba?\((.*)\)$/);
	if (rgbMatch) {
		const channels = rgbMatch[1]
			.split(/[\s,/]+/)
			.filter(Boolean)
			.slice(0, 3)
			.map((channel) =>
				channel.endsWith('%')
					? (Number.parseFloat(channel) / 100) * 255
					: Number.parseFloat(channel)
			);
		if (channels.length === 3 && channels.every((channel) => Number.isFinite(channel))) {
			const [red, green, blue] = channels.map((channel) => Math.min(255, Math.max(0, channel)));
			return toHex(red, green, blue);
		}
	}
	return null;
}
