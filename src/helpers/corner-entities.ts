import { Line, type Point, type Segment, Vector } from '@flatten-js/core';
import type { StartAndEndpointEntity } from '../App.types';
import { ArcEntity } from '../entities/ArcEntity';
import { type Entity, EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity';
import { copyEntityBaseProperties } from './copy-entity-base-properties';
import { explodeEntity } from './explode-entity';

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

	const geometry = getCornerGeometry(
		corner,
		firstTrimmed.direction,
		secondTrimmed.direction,
		cornerType,
		value
	);
	if (!geometry) {
		return { error: 'The lines are parallel' };
	}
	if (geometry.cutDistance > firstTrimmed.length || geometry.cutDistance > secondTrimmed.length) {
		return {
			error: `The ${cornerType === CornerType.FILLET ? 'radius' : 'distance'} is too large for these lines`,
		};
	}
	return {
		lines: [
			createLineLike(first.line, firstTrimmed.keptPoint, geometry.firstEnd),
			createLineLike(second.line, secondTrimmed.keptPoint, geometry.secondEnd),
		],
		connector: copyEntityBaseProperties(first.line, geometry.connector),
	};
}

interface CornerGeometry {
	/**
	 * Distance from the corner to where each line ends
	 */
	cutDistance: number;
	firstEnd: Point;
	secondEnd: Point;
	/**
	 * Arc for a fillet, line for a chamfer
	 */
	connector: Entity;
}

/**
 * Calculates where the lines end and the arc or line that connects them
 * The directions are unit vectors from the corner along each line
 * Returns null if the lines are parallel
 */
function getCornerGeometry(
	corner: Point,
	firstDirection: Vector,
	secondDirection: Vector,
	cornerType: CornerType,
	value: number
): CornerGeometry | null {
	// Angle between the two kept parts of the lines
	const cornerAngle = Math.acos(Math.min(1, Math.max(-1, firstDirection.dot(secondDirection))));
	if (cornerAngle < EPSILON || Math.PI - cornerAngle < EPSILON) {
		return null;
	}

	const cutDistance = cornerType === CornerType.FILLET ? value / Math.tan(cornerAngle / 2) : value;
	const firstEnd = corner.translate(firstDirection.multiply(cutDistance));
	const secondEnd = corner.translate(secondDirection.multiply(cutDistance));

	if (cornerType === CornerType.CHAMFER) {
		return { cutDistance, firstEnd, secondEnd, connector: new LineEntity(firstEnd, secondEnd) };
	}

	// The center of the fillet arc lies on the bisector of the corner
	const bisector = firstDirection.add(secondDirection).normalize();
	const center = corner.translate(bisector.multiply(value / Math.sin(cornerAngle / 2)));
	const startAngle = Math.atan2(firstEnd.y - center.y, firstEnd.x - center.x);
	const endAngle = Math.atan2(secondEnd.y - center.y, secondEnd.x - center.x);
	// The fillet is always the short arc between the two tangent points
	const counterClockwiseSweep = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);
	const arc = new ArcEntity(center, value, startAngle, endAngle, counterClockwiseSweep <= Math.PI);
	return { cutDistance, firstEnd, secondEnd, connector: arc };
}

/**
 * A straight piece of an entity that can be filleted or chamfered
 * - a line
 * - a straight segment of a rectangle or polyline
 */
export interface CornerTarget extends CornerLine {
	/**
	 * The entity the user clicked
	 */
	entity: Entity;
	/**
	 * Index of the clicked segment in the exploded rectangle or polyline, 0 for a line
	 */
	segmentIndex: number;
}

/**
 * Finds the straight piece of the entity closest to the click point
 * Returns null if the entity has no straight piece there, eg: a circle or an arc of a polyline
 */
export function getCornerTarget(entity: Entity, clickPoint: Point): CornerTarget | null {
	if (entity.getType() === EntityName.Line) {
		return { entity, segmentIndex: 0, line: entity as LineEntity, clickPoint };
	}
	if (![EntityName.Rectangle, EntityName.PolyLine].includes(entity.getType())) {
		return null;
	}
	const segments = explodeEntity(entity) ?? [];
	let closestIndex = -1;
	let closestDistance = Number.MAX_VALUE;
	segments.forEach((segment, index) => {
		const distance = segment.distanceTo(clickPoint)?.[0] ?? Number.MAX_VALUE;
		if (distance < closestDistance) {
			closestDistance = distance;
			closestIndex = index;
		}
	});
	const segment = segments[closestIndex];
	if (!segment || segment.getType() !== EntityName.Line) {
		return null;
	}
	// Unique id per segment, so two segments of the same rectangle count as different lines
	segment.id = `${entity.id}-${closestIndex}`;
	return { entity, segmentIndex: closestIndex, line: segment as LineEntity, clickPoint };
}

function sharesEndpoint(first: StartAndEndpointEntity, second: StartAndEndpointEntity): boolean {
	const firstPoints = [first.getStartPoint(), first.getEndPoint()];
	const secondPoints = [second.getStartPoint(), second.getEndPoint()];
	return firstPoints.some((point) => secondPoints.some((other) => point.equalTo(other)));
}

/**
 * Replaces the clicked lines by the trimmed lines and adds the connector
 * - two connected segments of the same rectangle or polyline: the result is a polyline with the corner in it
 * - otherwise: rectangles and polylines are exploded, so their clicked segment can be trimmed
 */
export function applyCorner(
	entities: Entity[],
	first: CornerTarget,
	second: CornerTarget,
	corner: { lines: [LineEntity, LineEntity]; connector: Entity | null }
): Entity[] {
	const [firstLine, secondLine] = corner.lines;
	const isSameMultiSegmentEntity =
		first.entity.id === second.entity.id && first.entity.getType() !== EntityName.Line;

	if (isSameMultiSegmentEntity) {
		const parts = explodeEntity(first.entity) as StartAndEndpointEntity[];
		const firstPart = parts[first.segmentIndex];
		const secondPart = parts[second.segmentIndex];
		if (sharesEndpoint(firstPart, secondPart)) {
			firstLine.id = firstPart.id;
			secondLine.id = secondPart.id;
			const newParts: Entity[] = [...parts];
			newParts[first.segmentIndex] = firstLine;
			newParts[second.segmentIndex] = secondLine;
			if (corner.connector) {
				// Keep the connector between the two segments, so the polyline stays in order
				const insertIndex =
					Math.abs(first.segmentIndex - second.segmentIndex) === 1
						? Math.max(first.segmentIndex, second.segmentIndex)
						: newParts.length;
				newParts.splice(insertIndex, 0, corner.connector);
			}
			const polyLine = copyEntityBaseProperties(first.entity, new PolyLineEntity(newParts));
			polyLine.id = first.entity.id;
			return entities.map((entity) => (entity.id === first.entity.id ? polyLine : entity));
		}
	}

	const replacements = new Map<string, Entity[]>();
	for (const [target, line] of [
		[first, firstLine],
		[second, secondLine],
	] as const) {
		if (target.entity.getType() === EntityName.Line) {
			line.id = target.entity.id;
			replacements.set(target.entity.id, [line]);
			continue;
		}
		const parts = replacements.get(target.entity.id) ?? (explodeEntity(target.entity) as Entity[]);
		line.id = crypto.randomUUID();
		parts[target.segmentIndex] = line;
		replacements.set(target.entity.id, parts);
	}
	const newEntities = entities.flatMap((entity) => replacements.get(entity.id) ?? [entity]);
	return corner.connector ? [...newEntities, corner.connector] : newEntities;
}

interface CornerSegment {
	/**
	 * The selected line, rectangle or polyline this segment belongs to
	 */
	source: Entity;
	/**
	 * Index of the segment in the exploded rectangle or polyline, 0 for a line
	 */
	partIndex: number;
	start: Point;
	end: Point;
	length: number;
	/**
	 * How much is cut off at the start and the end of the segment by the corners
	 */
	startCut: number;
	endCut: number;
}

interface SegmentEnd {
	segment: CornerSegment;
	atStart: boolean;
}

interface CornerConnector {
	connector: Entity;
	first: SegmentEnd;
	second: SegmentEnd;
}

export interface MultiCornerResult {
	entities: Entity[];
	/**
	 * The new arcs or lines that round or cut off the corners
	 */
	connectors: Entity[];
	/**
	 * Corners that couldn't be made, because the lines are parallel or the radius or distance is too large
	 */
	skippedCount: number;
}

/**
 * Fillets or chamfers every corner where exactly two of the selected straight segments meet in an endpoint
 * - lines keep their id
 * - rectangles and polylines become polylines with the corners in them
 * - a rectangle or polyline that forms a corner with another entity is exploded into lines
 */
export function createCornersAtSharedPoints(
	selectedEntities: Entity[],
	entities: Entity[],
	cornerType: CornerType,
	value: number
): MultiCornerResult {
	const partsBySourceId = new Map<string, Entity[]>();
	const segments: CornerSegment[] = [];
	for (const entity of selectedEntities) {
		const type = entity.getType();
		if (![EntityName.Line, EntityName.Rectangle, EntityName.PolyLine].includes(type)) {
			continue;
		}
		const parts = type === EntityName.Line ? [entity] : (explodeEntity(entity) ?? []);
		partsBySourceId.set(entity.id, parts);
		parts.forEach((part, partIndex) => {
			if (part.getType() !== EntityName.Line) {
				return;
			}
			const line = part as LineEntity;
			const start = line.getStartPoint();
			const end = line.getEndPoint();
			segments.push({
				source: entity,
				partIndex,
				start,
				end,
				length: start.distanceTo(end)[0],
				startCut: 0,
				endCut: 0,
			});
		});
	}

	// Group the segment endpoints by location
	const endGroups: { point: Point; ends: SegmentEnd[] }[] = [];
	for (const segment of segments) {
		for (const atStart of [true, false]) {
			const point = atStart ? segment.start : segment.end;
			const group = endGroups.find((endGroup) => endGroup.point.equalTo(point));
			if (group) {
				group.ends.push({ segment, atStart });
			} else {
				endGroups.push({ point, ends: [{ segment, atStart }] });
			}
		}
	}

	const connectors: CornerConnector[] = [];
	let skippedCount = 0;
	for (const { point, ends } of endGroups) {
		// Points where 3 or more segments meet are ambiguous, a zero length segment has no direction
		if (ends.length !== 2 || ends[0].segment === ends[1].segment || value <= 0) {
			continue;
		}
		const [first, second] = ends;
		const geometry = getCornerGeometry(
			point,
			getDirectionFromEnd(first),
			getDirectionFromEnd(second),
			cornerType,
			value
		);
		if (
			!geometry ||
			!fitsCut(first, geometry.cutDistance) ||
			!fitsCut(second, geometry.cutDistance)
		) {
			skippedCount++;
			continue;
		}
		applyCut(first, geometry.cutDistance);
		applyCut(second, geometry.cutDistance);
		connectors.push({
			connector: copyEntityBaseProperties(first.segment.source, geometry.connector),
			first,
			second,
		});
	}

	if (!connectors.length) {
		return { entities, connectors: [], skippedCount };
	}

	// Replace the trimmed segments in their parts
	for (const segment of segments) {
		if (!segment.startCut && !segment.endCut) {
			continue;
		}
		const parts = partsBySourceId.get(segment.source.id) as Entity[];
		const direction = new Vector(segment.start, segment.end).normalize();
		parts[segment.partIndex] = createLineLike(
			parts[segment.partIndex],
			segment.start.translate(direction.multiply(segment.startCut)),
			segment.end.translate(direction.multiply(-segment.endCut))
		);
	}

	// Rectangles and polylines with a corner to another entity are exploded, the others stay one polyline
	const explodedSourceIds = new Set<string>();
	const changedSourceIds = new Set<string>();
	const looseConnectors: Entity[] = [];
	const connectorsAfterPart = new Map<string, Entity[]>();
	for (const { connector, first, second } of connectors) {
		changedSourceIds.add(first.segment.source.id);
		changedSourceIds.add(second.segment.source.id);
		if (
			first.segment.source.id !== second.segment.source.id ||
			first.segment.source.getType() === EntityName.Line
		) {
			explodedSourceIds.add(first.segment.source.id);
			explodedSourceIds.add(second.segment.source.id);
			looseConnectors.push(connector);
			continue;
		}
		// Put the connector after the segment that ends in the corner, so the polyline stays in order
		const anchor = !first.atStart ? first : !second.atStart ? second : first;
		const key = `${anchor.segment.source.id}-${anchor.segment.partIndex}`;
		connectorsAfterPart.set(key, [...(connectorsAfterPart.get(key) ?? []), connector]);
	}

	const newEntities = entities.flatMap((entity): Entity[] => {
		if (!changedSourceIds.has(entity.id)) {
			return [entity];
		}
		const parts = (partsBySourceId.get(entity.id) as Entity[]).flatMap((part, index) => [
			part,
			...(connectorsAfterPart.get(`${entity.id}-${index}`) ?? []),
		]);
		if (entity.getType() === EntityName.Line || explodedSourceIds.has(entity.id)) {
			return parts;
		}
		const polyLine = copyEntityBaseProperties(entity, new PolyLineEntity(parts));
		polyLine.id = entity.id;
		return [polyLine];
	});
	return {
		entities: [...newEntities, ...looseConnectors],
		connectors: connectors.map(({ connector }) => connector),
		skippedCount,
	};
}

/**
 * Unit vector from the corner along the segment
 */
function getDirectionFromEnd({ segment, atStart }: SegmentEnd): Vector {
	return atStart
		? new Vector(segment.start, segment.end).normalize()
		: new Vector(segment.end, segment.start).normalize();
}

function fitsCut({ segment }: SegmentEnd, cutDistance: number): boolean {
	return segment.startCut + segment.endCut + cutDistance <= segment.length + EPSILON;
}

function applyCut({ segment, atStart }: SegmentEnd, cutDistance: number): void {
	if (atStart) {
		segment.startCut = cutDistance;
	} else {
		segment.endCut = cutDistance;
	}
}
