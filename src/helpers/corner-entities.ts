import { Line, type Point, type Segment, Vector } from '@flatten-js/core';
import { ArcEntity } from '../entities/ArcEntity';
import type { Entity } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { copyEntityBaseProperties } from './copy-entity-base-properties';

export enum CornerType {
	FILLET = 'FILLET',
	CHAMFER = 'CHAMFER',
}

export interface CornerLine {
	line: LineEntity;
	/**
	 * Where the user clicked the line, this part of the line is kept
	 */
	clickPoint: Point;
}

export type CornerResult =
	| {
			lines: [LineEntity, LineEntity];
			/**
			 * Arc for a fillet, line for a chamfer, null for a sharp corner
			 */
			connector: Entity | null;
	  }
	| { error: string };

const EPSILON = 1e-9;

interface TrimmedLine {
	/**
	 * Endpoint of the line that stays where it is
	 */
	keptPoint: Point;
	/**
	 * Unit vector from the corner towards the kept point
	 */
	direction: Vector;
	/**
	 * Distance from the corner to the kept point
	 */
	length: number;
}

/**
 * Finds which end of the line is kept, based on the side of the corner where the user clicked
 */
function getTrimmedLine(cornerLine: CornerLine, corner: Point): TrimmedLine | null {
	const segment = cornerLine.line.getShape() as Segment;
	const clickProjection = cornerLine.clickPoint.projectionOn(new Line(segment.start, segment.end));
	if (clickProjection.equalTo(corner)) {
		return null;
	}
	const direction = new Vector(corner, clickProjection).normalize();
	// The kept point is the end that is furthest along the clicked side of the corner
	const startAlong = new Vector(corner, segment.start).dot(direction);
	const endAlong = new Vector(corner, segment.end).dot(direction);
	const keptPoint = startAlong >= endAlong ? segment.start : segment.end;
	const length = Math.max(startAlong, endAlong);
	if (length <= EPSILON) {
		return null;
	}
	return { keptPoint, direction, length };
}

function createLineLike(source: Entity, start: Point, end: Point): LineEntity {
	const line = copyEntityBaseProperties(source, new LineEntity(start, end));
	line.id = source.id;
	return line;
}

/**
 * Trims or extends two lines, so they meet in a corner
 * - fillet: the corner is rounded with an arc of the given radius
 * - chamfer: the corner is cut off with a line at the given distance from the corner
 * - a value of 0 makes a sharp corner
 * The resulting lines keep the id of the original lines, so they replace them
 */
export function createCorner(
	first: CornerLine,
	second: CornerLine,
	cornerType: CornerType,
	value: number
): CornerResult {
	if (first.line.id === second.line.id) {
		return { error: 'Select two different lines' };
	}
	const firstSegment = first.line.getShape() as Segment;
	const secondSegment = second.line.getShape() as Segment;
	const corner = new Line(firstSegment.start, firstSegment.end).intersect(
		new Line(secondSegment.start, secondSegment.end)
	)[0];
	if (!corner) {
		return { error: 'Parallel lines have no corner' };
	}

	const firstTrimmed = getTrimmedLine(first, corner);
	const secondTrimmed = getTrimmedLine(second, corner);
	if (!firstTrimmed || !secondTrimmed) {
		return { error: 'Click the lines on the part you want to keep' };
	}

	if (value <= 0) {
		return {
			lines: [
				createLineLike(first.line, firstTrimmed.keptPoint, corner),
				createLineLike(second.line, secondTrimmed.keptPoint, corner),
			],
			connector: null,
		};
	}

	// Angle between the two kept parts of the lines
	const cornerAngle = Math.acos(
		Math.min(1, Math.max(-1, firstTrimmed.direction.dot(secondTrimmed.direction)))
	);
	if (cornerAngle < EPSILON || Math.PI - cornerAngle < EPSILON) {
		return { error: 'The lines are parallel' };
	}

	// Distance from the corner to where each line ends
	const cutDistance = cornerType === CornerType.FILLET ? value / Math.tan(cornerAngle / 2) : value;
	if (cutDistance > firstTrimmed.length || cutDistance > secondTrimmed.length) {
		return {
			error: `The ${cornerType === CornerType.FILLET ? 'radius' : 'distance'} is too large for these lines`,
		};
	}
	const firstEnd = corner.translate(firstTrimmed.direction.multiply(cutDistance));
	const secondEnd = corner.translate(secondTrimmed.direction.multiply(cutDistance));
	const lines: [LineEntity, LineEntity] = [
		createLineLike(first.line, firstTrimmed.keptPoint, firstEnd),
		createLineLike(second.line, secondTrimmed.keptPoint, secondEnd),
	];

	if (cornerType === CornerType.CHAMFER) {
		return {
			lines,
			connector: copyEntityBaseProperties(first.line, new LineEntity(firstEnd, secondEnd)),
		};
	}

	// The center of the fillet arc lies on the bisector of the corner
	const bisector = firstTrimmed.direction.add(secondTrimmed.direction).normalize();
	const center = corner.translate(bisector.multiply(value / Math.sin(cornerAngle / 2)));
	const startAngle = Math.atan2(firstEnd.y - center.y, firstEnd.x - center.x);
	const endAngle = Math.atan2(secondEnd.y - center.y, secondEnd.x - center.x);
	// The fillet is always the short arc between the two tangent points
	const counterClockwiseSweep = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
	const arc = new ArcEntity(center, value, startAngle, endAngle, counterClockwiseSweep <= Math.PI);
	return { lines, connector: copyEntityBaseProperties(first.line, arc) };
}
