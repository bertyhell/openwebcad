import type {Point} from "@flatten-js/core";
import type {BoundingBox} from "../App.types.ts";

export function isPointInsideBox(box: BoundingBox, point: Point) {
	return box.minX <= point.x && box.minY <= point.y && box.maxX >= point.x && box.maxY >= point.y;
}
