/**
 * If the color is white return black since the canvas background is black, it makes sense to invert the color for white
 * @param color
 */
export function getExportColor(color: string): string {
  if (
    color.toLowerCase() === '#fff' ||
    color.toLowerCase() === 'white' ||
    color.toLowerCase() === '#FFFFFF'
  ) {
    return '#000';
  }
  return color;
}
