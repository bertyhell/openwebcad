import {Point, Segment} from "@flatten-js/core";

export function mirrorPointOverAxis(point: Point, mirrorAxis: Segment) {
	const pointDistanceToMirror = mirrorAxis.distanceTo(point);
	const pointOnMirror = pointDistanceToMirror[1].end;
	return new Point(point.x)
}
