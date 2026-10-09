import {
	type Arc,
	type Circle,
	Line,
	type Point,
	Polygon,
	type Segment,
	Vector,
} from '@flatten-js/core';
import { ArcEntity } from '../entities/ArcEntity';
import { CircleEntity } from '../entities/CircleEntity';
import { type Entity, EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity';
import { RectangleEntity } from '../entities/RectangleEntity';
import { copyEntityBaseProperties } from './copy-entity-base-properties';

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
 * Points of a polyline made of lines only, null when it contains arcs
 */
function getPolyLinePoints(
	polyLine: PolyLineEntity
): { points: Point[]; isClosed: boolean } | null {
	if (polyLine.entities.some((entity) => entity.getType() !== EntityName.Line)) {
		return null;
	}
	const points = [
		polyLine.entities[0].getStartPoint(),
		...polyLine.entities.map((entity) => entity.getEndPoint()),
	];
	const isClosed = points.length > 2 && points[0].equalTo(points[points.length - 1]);
	if (isClosed) {
		points.pop();
	}
	return { points, isClosed };
}

function createPolyLine(points: Point[], isClosed: boolean): PolyLineEntity {
	const chain = isClosed ? [...points, points[0]] : points;
	const lines: LineEntity[] = [];
	for (let index = 0; index < chain.length - 1; index++) {
		lines.push(new LineEntity(chain[index], chain[index + 1]));
	}
	return new PolyLineEntity(lines);
}

/**
 * Lines, circles, arcs, rectangles and polylines made of lines can be offset
 */
export function canOffsetEntity(entity: Entity): boolean {
	switch (entity.getType()) {
		case EntityName.Line:
		case EntityName.Circle:
		case EntityName.Arc:
		case EntityName.Rectangle:
			return true;
		case EntityName.PolyLine:
			return !!getPolyLinePoints(entity as PolyLineEntity);
		default:
			return false;
	}
}

/**
 * Creates a copy of the entity at the given distance, on the side of the side point
 * Lines move parallel, circles and arcs get a larger or smaller radius,
 * rectangles and polylines made of lines grow or shrink with mitered corners
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
			const polyLinePoints = getPolyLinePoints(entity as PolyLineEntity);
			if (!polyLinePoints || polyLinePoints.points.length < 2) {
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
	}

	return offsetResult ? copyEntityBaseProperties(entity, offsetResult) : null;
}
