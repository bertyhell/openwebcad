import {Arc, Point, Segment} from "@flatten-js/core";

export function approximateArc(arc: Arc, numberOfSegments: number = 10): Segment[] {
	const segments: Segment[] = [];
	const totalArcLength = arc.length;
	let lastPoint = arc.start;
	for (let i = 1; i < numberOfSegments; i += 1) {
		const startPoint = lastPoint;
		const endPoint = arc.pointAtLength(totalArcLength/numberOfSegments*i) as Point;
		segments.push(new Segment(startPoint, endPoint));
		lastPoint = endPoint;
	}
	segments.push(new Segment(lastPoint, arc.end));

	return segments;
}
