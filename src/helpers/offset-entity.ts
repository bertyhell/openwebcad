import { Arc, Circle, Line, Point, Polygon, Segment, Vector } from '@flatten-js/core';
import { ArcEntity } from '../entities/ArcEntity';
import { CircleEntity } from '../entities/CircleEntity';
import { type Entity, EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity';
import { RectangleEntity } from '../entities/RectangleEntity';
import { copyEntityBaseProperties } from './copy-entity-base-properties';
import { chainSegments } from './order-edge-boundary';

/**
 * Which side of the directed line from start to end the point is on: 1 for left, -1 for right, 0 on the line
 */
function getSideOfLine(start: Point, end: Point, point: Point): number {
	const cross = (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
	return Math.sign(cross);
}

/**
 * Normal vector of length 1, pointing to the left of the direction start => end
 */
function getLeftNormal(start: Point, end: Point): Vector {
	return new Vector(start, end).normalize().rotate90CCW();
}

function offsetSegmentPoints(start: Point, end: Point, distance: number): [Point, Point] {
	const offset = getLeftNormal(start, end).multiply(distance);
	return [start.translate(offset), end.translate(offset)];
}

/**
 * Offsets every edge of a chain of points to the left and joins neighbouring edges where their offset lines intersect
 * @param points vertices of the chain
 * @param isClosed whether the last point connects back to the first point
 * @param distance positive offsets to the left of the walking direction, negative to the right
 */
export function offsetPointChain(points: Point[], isClosed: boolean, distance: number): Point[] {
	const edgeCount = isClosed ? points.length : points.length - 1;
	const offsetEdges: [Point, Point][] = [];
	for (let index = 0; index < edgeCount; index++) {
		offsetEdges.push(
			offsetSegmentPoints(points[index], points[(index + 1) % points.length], distance)
		);
	}

	const joinEdges = (edgeA: [Point, Point], edgeB: [Point, Point]): Point => {
		const intersection = new Line(edgeA[0], edgeA[1]).intersect(new Line(edgeB[0], edgeB[1]))[0];
		// Parallel neighbouring edges don't intersect, they share the offset point
		return intersection ?? edgeA[1];
	};

	if (isClosed) {
		return offsetEdges.map((edge, index) =>
			joinEdges(offsetEdges[(index - 1 + edgeCount) % edgeCount], edge)
		);
	}

	const offsetPoints = [offsetEdges[0][0]];
	for (let index = 1; index < edgeCount; index++) {
		offsetPoints.push(joinEdges(offsetEdges[index - 1], offsetEdges[index]));
	}
	offsetPoints.push(offsetEdges[edgeCount - 1][1]);
	return offsetPoints;
}

function getSignedArea(points: Point[]): number {
	let area = 0;
	for (let index = 0; index < points.length; index++) {
		const point = points[index];
		const nextPoint = points[(index + 1) % points.length];
		area += point.x * nextPoint.y - nextPoint.x * point.y;
	}
	return area / 2;
}

/**
 * An offset that is too large turns edges around, eg: shrinking a square more than half its size
 * Every offset edge should point in the same direction as the original edge
 */
function keepsEdgeDirections(points: Point[], offsetPoints: Point[], isClosed: boolean): boolean {
	const edgeCount = isClosed ? points.length : points.length - 1;
	for (let index = 0; index < edgeCount; index++) {
		const nextIndex = (index + 1) % points.length;
		const originalEdge = new Vector(points[index], points[nextIndex]);
		const offsetEdge = new Vector(offsetPoints[index], offsetPoints[nextIndex]);
		if (originalEdge.dot(offsetEdge) <= 0) {
			return false;
		}
	}
	return true;
}

/**
 * Offset a closed shape of straight edges, towards the inside when the side point is inside the shape
 */
function offsetClosedPoints(points: Point[], distance: number, sidePoint: Point): Point[] | null {
	const isInside = new Polygon(points).contains(sidePoint);
	// For counterclockwise points, the left side is the inside
	const isCounterClockwise = getSignedArea(points) > 0;
	const towardsLeft = isInside === isCounterClockwise;
	const offsetPoints = offsetPointChain(points, true, towardsLeft ? distance : -distance);
	return keepsEdgeDirections(points, offsetPoints, true) ? offsetPoints : null;
}

/**
 * Offset an open chain of straight edges, towards the side of the edge closest to the side point
 */
function offsetOpenPoints(points: Point[], distance: number, sidePoint: Point): Point[] | null {
	let closestEdgeIndex = 0;
	let closestDistance = Number.POSITIVE_INFINITY;
	for (let index = 0; index < points.length - 1; index++) {
		const edgeLine = new LineEntity(points[index], points[index + 1]);
		const edgeDistance = edgeLine.distanceTo(sidePoint)?.[0] ?? Number.POSITIVE_INFINITY;
		if (edgeDistance < closestDistance) {
			closestDistance = edgeDistance;
			closestEdgeIndex = index;
		}
	}
	const side = getSideOfLine(points[closestEdgeIndex], points[closestEdgeIndex + 1], sidePoint);
	const offsetPoints = offsetPointChain(points, false, side >= 0 ? distance : -distance);
	return keepsEdgeDirections(points, offsetPoints, false) ? offsetPoints : null;
}

/**
 * A line or arc of a polyline, oriented so it starts where the previous one ends
 */
type ChainSegment =
	| { kind: 'line'; start: Point; end: Point }
	| {
			kind: 'arc';
			start: Point;
			end: Point;
			center: Point;
			radius: number;
			counterClockwise: boolean;
			sweep: number;
	  };

const ARC_SAMPLE_COUNT = 16;

function getAngle(center: Point, point: Point): number {
	const angle = Math.atan2(point.y - center.y, point.x - center.x);
	return angle < 0 ? angle + 2 * Math.PI : angle;
}

function getSweep(startAngle: number, endAngle: number, counterClockwise: boolean): number {
	const sweep = counterClockwise ? endAngle - startAngle : startAngle - endAngle;
	return ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

function pointOnCircle(center: Point, radius: number, angle: number): Point {
	return new Point(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));
}

/**
 * Lines and arcs of a connected polyline in walking order, null when it contains other entities or has gaps
 */
function getPolyLineChain(
	polyLine: PolyLineEntity
): { segments: ChainSegment[]; isClosed: boolean } | null {
	if (
		polyLine.entities.length === 0 ||
		polyLine.entities.some(
			(entity) => entity.getType() !== EntityName.Line && entity.getType() !== EntityName.Arc
		)
	) {
		return null;
	}
	const entities = chainSegments(polyLine.entities);
	const isConnected = entities.every(
		(entity, index) =>
			index === 0 || entities[index - 1].getEndPoint().equalTo(entity.getStartPoint())
	);
	if (!isConnected) {
		return null;
	}
	const segments: ChainSegment[] = entities.map((entity) => {
		if (entity.getType() === EntityName.Line) {
			return { kind: 'line', start: entity.getStartPoint(), end: entity.getEndPoint() };
		}
		const arc = entity.getShape() as Arc;
		return {
			kind: 'arc',
			start: arc.start,
			end: arc.end,
			center: arc.center,
			radius: arc.r.valueOf(),
			counterClockwise: arc.counterClockwise,
			sweep: arc.sweep,
		};
	});
	const isClosed =
		segments.length > 1 && segments[0].start.equalTo(segments[segments.length - 1].end);
	return { segments, isClosed };
}

/**
 * Points of a polyline made of lines only, null when it contains arcs
 */
function getPolyLinePoints(
	chain: { segments: ChainSegment[]; isClosed: boolean } | null
): { points: Point[]; isClosed: boolean } | null {
	if (!chain || chain.segments.some((segment) => segment.kind !== 'line')) {
		return null;
	}
	const points = [chain.segments[0].start, ...chain.segments.map((segment) => segment.end)];
	if (chain.isClosed) {
		points.pop();
	}
	return { points, isClosed: chain.isClosed };
}

/**
 * Points along the chain, arcs are approximated by straight pieces
 */
function sampleChain(segments: ChainSegment[]): Point[] {
	const points: Point[] = [];
	for (const segment of segments) {
		points.push(segment.start);
		if (segment.kind === 'arc') {
			const startAngle = getAngle(segment.center, segment.start);
			const direction = segment.counterClockwise ? 1 : -1;
			for (let index = 1; index < ARC_SAMPLE_COUNT; index++) {
				const angle = startAngle + (direction * segment.sweep * index) / ARC_SAMPLE_COUNT;
				points.push(pointOnCircle(segment.center, segment.radius, angle));
			}
		}
	}
	return points;
}

/**
 * Moves a segment to the left of its walking direction, arcs keep their center and change radius
 * @returns null when an arc would get a radius of zero or less
 */
function offsetChainSegment(segment: ChainSegment, distance: number): ChainSegment | null {
	if (segment.kind === 'line') {
		const [start, end] = offsetSegmentPoints(segment.start, segment.end, distance);
		return { kind: 'line', start, end };
	}
	// For a counterclockwise arc, the left side is towards the center
	const radius = segment.radius + (segment.counterClockwise ? -distance : distance);
	if (radius <= 1e-9) {
		return null;
	}
	const scale = (point: Point) =>
		pointOnCircle(segment.center, radius, getAngle(segment.center, point));
	return { ...segment, radius, start: scale(segment.start), end: scale(segment.end) };
}

function getCarrierShape(segment: ChainSegment): Line | Circle {
	return segment.kind === 'line'
		? new Line(segment.start, segment.end)
		: new Circle(segment.center, segment.radius);
}

/**
 * Where two neighbouring offset segments meet:
 * the shared point when they still touch (eg: tangent arcs), else the intersection of their extensions closest to the original vertex
 * @returns null when their extensions don't intersect, eg: an arc moving away from a line on the outside of a corner
 */
function joinChainSegments(
	segmentA: ChainSegment,
	segmentB: ChainSegment,
	vertex: Point
): Point | null {
	if (segmentA.end.equalTo(segmentB.start)) {
		return segmentA.end;
	}
	if (segmentA.kind === 'line' && segmentB.kind === 'line') {
		return joinLinesOrShared(segmentA, segmentB);
	}
	const intersections = getCarrierShape(segmentA).intersect(getCarrierShape(segmentB) as Circle);
	if (!intersections.length) {
		return null;
	}
	return intersections.reduce((closest, point) =>
		point.distanceTo(vertex)[0] < closest.distanceTo(vertex)[0] ? point : closest
	);
}

function joinLinesOrShared(segmentA: ChainSegment, segmentB: ChainSegment): Point {
	const intersection = new Line(segmentA.start, segmentA.end).intersect(
		new Line(segmentB.start, segmentB.end)
	)[0];
	// Parallel neighbouring edges don't intersect, they share the offset point
	return intersection ?? segmentA.end;
}

/**
 * An offset that is too large turns segments around, eg: shrinking an arc past its own end points
 */
function keepsSegmentDirection(original: ChainSegment, offset: ChainSegment): boolean {
	if (original.kind === 'line') {
		return new Vector(original.start, original.end).dot(new Vector(offset.start, offset.end)) > 0;
	}
	if (offset.kind !== 'arc') {
		return false;
	}
	const sweep = getSweep(
		getAngle(offset.center, offset.start),
		getAngle(offset.center, offset.end),
		offset.counterClockwise
	);
	return sweep > 1e-9 && Math.abs(sweep - original.sweep) < Math.PI;
}

function withEndPoints(segment: ChainSegment, start: Point, end: Point): ChainSegment {
	return { ...segment, start, end };
}

/**
 * Round join around the original vertex, for neighbouring offset segments that don't intersect
 */
function createJoinArc(vertex: Point, start: Point, end: Point): ChainSegment {
	const startAngle = getAngle(vertex, start);
	const endAngle = getAngle(vertex, end);
	const counterClockwise = getSweep(startAngle, endAngle, true) < Math.PI;
	return {
		kind: 'arc',
		start,
		end,
		center: vertex,
		radius: vertex.distanceTo(start)[0],
		counterClockwise,
		sweep: getSweep(startAngle, endAngle, counterClockwise),
	};
}

/**
 * Offsets a chain of lines and arcs to the left and trims or extends neighbouring segments to meet each other
 * @param distance positive offsets to the left of the walking direction, negative to the right
 * @returns null when the offset is too large for one of the segments
 */
function offsetChain(
	segments: ChainSegment[],
	isClosed: boolean,
	distance: number
): ChainSegment[] | null {
	const offsetSegments: ChainSegment[] = [];
	for (const segment of segments) {
		const offsetSegment = offsetChainSegment(segment, distance);
		if (!offsetSegment) {
			return null;
		}
		offsetSegments.push(offsetSegment);
	}

	const count = segments.length;
	const starts = offsetSegments.map((segment) => segment.start);
	const ends = offsetSegments.map((segment) => segment.end);
	const joinArcs: (ChainSegment | null)[] = new Array(count).fill(null);
	const joinCount = isClosed ? count : count - 1;
	for (let index = 0; index < joinCount; index++) {
		const nextIndex = (index + 1) % count;
		const vertex = segments[index].end;
		const joint = joinChainSegments(offsetSegments[index], offsetSegments[nextIndex], vertex);
		if (joint) {
			ends[index] = joint;
			starts[nextIndex] = joint;
		} else {
			joinArcs[index] = createJoinArc(vertex, ends[index], starts[nextIndex]);
		}
	}

	const result: ChainSegment[] = [];
	for (let index = 0; index < count; index++) {
		const trimmed = withEndPoints(offsetSegments[index], starts[index], ends[index]);
		if (!keepsSegmentDirection(segments[index], trimmed)) {
			return null;
		}
		result.push(trimmed);
		const joinArc = joinArcs[index];
		if (joinArc) {
			result.push(joinArc);
		}
	}
	return result;
}

/**
 * Which way to offset the chain to end up on the side of the side point
 * Closed chains: towards the inside when the side point is inside. Open chains: the side of the closest segment
 */
function isSidePointLeftOfChain(
	segments: ChainSegment[],
	isClosed: boolean,
	sidePoint: Point
): boolean {
	if (isClosed) {
		const points = sampleChain(segments);
		const isInside = new Polygon(points).contains(sidePoint);
		// For counterclockwise points, the left side is the inside
		return isInside === getSignedArea(points) > 0;
	}
	let closestSegment = segments[0];
	let closestDistance = Number.POSITIVE_INFINITY;
	for (const segment of segments) {
		const shape =
			segment.kind === 'line'
				? new Segment(segment.start, segment.end)
				: new Arc(
						segment.center,
						segment.radius,
						getAngle(segment.center, segment.start),
						getAngle(segment.center, segment.end),
						segment.counterClockwise
					);
		const segmentDistance = shape.distanceTo(sidePoint)[0];
		if (segmentDistance < closestDistance) {
			closestDistance = segmentDistance;
			closestSegment = segment;
		}
	}
	if (closestSegment.kind === 'line') {
		return getSideOfLine(closestSegment.start, closestSegment.end, sidePoint) >= 0;
	}
	const isInside = closestSegment.center.distanceTo(sidePoint)[0] < closestSegment.radius;
	return isInside === closestSegment.counterClockwise;
}

function createPolyLine(points: Point[], isClosed: boolean): PolyLineEntity {
	const chain = isClosed ? [...points, points[0]] : points;
	const lines: LineEntity[] = [];
	for (let index = 0; index < chain.length - 1; index++) {
		lines.push(new LineEntity(chain[index], chain[index + 1]));
	}
	return new PolyLineEntity(lines);
}

function createChainPolyLine(segments: ChainSegment[]): PolyLineEntity {
	return new PolyLineEntity(
		segments.map((segment) =>
			segment.kind === 'line'
				? new LineEntity(segment.start, segment.end)
				: new ArcEntity(
						segment.center.clone(),
						segment.radius,
						getAngle(segment.center, segment.start),
						getAngle(segment.center, segment.end),
						segment.counterClockwise
					)
		)
	);
}

/**
 * Lines, circles, arcs, rectangles and connected polylines of lines and arcs can be offset
 */
export function canOffsetEntity(entity: Entity): boolean {
	switch (entity.getType()) {
		case EntityName.Line:
		case EntityName.Circle:
		case EntityName.Arc:
		case EntityName.Rectangle:
			return true;
		case EntityName.PolyLine:
			return !!getPolyLineChain(entity as PolyLineEntity);
		default:
			return false;
	}
}

/**
 * Creates a copy of the entity at the given distance, on the side of the side point
 * Lines move parallel, circles and arcs get a larger or smaller radius,
 * rectangles and polylines grow or shrink with mitered corners, arcs in polylines keep their center
 * @returns null when the entity can't be offset, eg: an inward offset larger than a circle's radius
 */
export function offsetEntity(entity: Entity, distance: number, sidePoint: Point): Entity | null {
	if (distance <= 0) {
		return null;
	}
	let offsetResult: Entity | null = null;

	switch (entity.getType()) {
		case EntityName.Line: {
			const segment = entity.getShape() as Segment;
			const side = getSideOfLine(segment.start, segment.end, sidePoint);
			const [start, end] = offsetSegmentPoints(
				segment.start,
				segment.end,
				side >= 0 ? distance : -distance
			);
			offsetResult = new LineEntity(start, end);
			break;
		}

		case EntityName.Circle: {
			const circle = entity.getShape() as Circle;
			const isInside = circle.center.distanceTo(sidePoint)[0] < circle.r.valueOf();
			const radius = circle.r.valueOf() + (isInside ? -distance : distance);
			if (radius > 0) {
				offsetResult = new CircleEntity(circle.center.clone(), radius);
			}
			break;
		}

		case EntityName.Arc: {
			const arc = entity.getShape() as Arc;
			const isInside = arc.center.distanceTo(sidePoint)[0] < arc.r.valueOf();
			const radius = arc.r.valueOf() + (isInside ? -distance : distance);
			if (radius > 0) {
				offsetResult = new ArcEntity(
					arc.center.clone(),
					radius,
					arc.startAngle,
					arc.endAngle,
					arc.counterClockwise
				);
			}
			break;
		}

		case EntityName.Rectangle: {
			const polygon = entity.getShape() as Polygon;
			const offsetPoints = offsetClosedPoints(polygon.vertices, distance, sidePoint);
			if (offsetPoints) {
				offsetResult = new RectangleEntity(new Polygon(offsetPoints));
			}
			break;
		}

		case EntityName.PolyLine: {
			const chain = getPolyLineChain(entity as PolyLineEntity);
			if (!chain) {
				break;
			}
			const polyLinePoints = getPolyLinePoints(chain);
			if (polyLinePoints) {
				if (polyLinePoints.points.length < 2) {
					break;
				}
				const { points, isClosed } = polyLinePoints;
				const offsetPoints = isClosed
					? offsetClosedPoints(points, distance, sidePoint)
					: offsetOpenPoints(points, distance, sidePoint);
				if (offsetPoints) {
					offsetResult = createPolyLine(offsetPoints, isClosed);
				}
				break;
			}
			const towardsLeft = isSidePointLeftOfChain(chain.segments, chain.isClosed, sidePoint);
			const offsetSegments = offsetChain(
				chain.segments,
				chain.isClosed,
				towardsLeft ? distance : -distance
			);
			if (offsetSegments) {
				offsetResult = createChainPolyLine(offsetSegments);
			}
			break;
		}
	}

	return offsetResult ? copyEntityBaseProperties(entity, offsetResult) : null;
}
