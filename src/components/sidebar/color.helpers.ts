/**
 * Expands short hex colors, so #fff and #FFFFFF are considered equal and can be used in a color input
 */
export function toFullHexColor(color: string): string {
	const lowerCaseColor = color.toLowerCase();
	if (/^#[0-9a-f]{3}$/.test(lowerCaseColor)) {
		return `#${[...lowerCaseColor.slice(1)].map((char) => char + char).join('')}`;
	}
	return lowerCaseColor;
}
