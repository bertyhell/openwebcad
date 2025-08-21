import type {BoundingBox} from './get-bounding-box-of-multiple-entities.ts';

export function isPointInsideBox(box: BoundingBox, point: Point) {
	return box.minX <= point.x && box.minY <= point.y && box.maxX >= point.x && box.maxY >= point.y;
}
