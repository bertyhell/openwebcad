import { type Arc, Circle, Line, type Point, type Segment, Vector } from '@flatten-js/core';
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

/**
 * A straight line or a circle arc that can be filleted
 */
export type CornerEdgeEntity = LineEntity | ArcEntity;

export interface CornerLine {
	edge: CornerEdgeEntity;
	/**
	 * Where the user clicked the edge, this part of the edge is kept
	 */
	clickPoint: Point;
}

export type CornerResult =
	| {
			/**
			 * The trimmed or extended edges, a line or an arc
			 */
			edges: [CornerEdgeEntity, CornerEdgeEntity];
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
	const segment = cornerLine.edge.getShape() as Segment;
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
	if (first.edge.id === second.edge.id) {
		return { error: 'Select two different lines' };
	}
	if (first.edge.getType() === EntityName.Arc || second.edge.getType() === EntityName.Arc) {
		return createArcCorner(first, second, cornerType, value);
	}
	const firstSegment = first.edge.getShape() as Segment;
	const secondSegment = second.edge.getShape() as Segment;
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
			edges: [
				createLineLike(first.edge, firstTrimmed.keptPoint, corner),
				createLineLike(second.edge, secondTrimmed.keptPoint, corner),
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
		edges: [
			createLineLike(first.edge, firstTrimmed.keptPoint, geometry.firstEnd),
			createLineLike(second.edge, secondTrimmed.keptPoint, geometry.secondEnd),
		],
		connector: copyEntityBaseProperties(first.edge, geometry.connector),
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
 * A piece of an entity that can be filleted or chamfered
 * - a line or an arc
 * - a straight or arc segment of a rectangle or polyline
 */
export interface CornerTarget extends CornerLine {
	/**
	 * The entity the user clicked
	 */
	entity: Entity;
	/**
	 * Index of the clicked segment in the exploded rectangle or polyline, 0 for a line or arc
	 */
	segmentIndex: number;
}

const SINGLE_EDGE_TYPES = [EntityName.Line, EntityName.Arc];

/**
 * Finds the piece of the entity closest to the click point
 * Arcs are only allowed if allowArcs is true, since only a fillet can connect to an arc
 * Returns null if the entity has no usable piece there, eg: a circle
 */
export function getCornerTarget(
	entity: Entity,
	clickPoint: Point,
	allowArcs = false
): CornerTarget | null {
	const allowedEdgeTypes = allowArcs ? SINGLE_EDGE_TYPES : [EntityName.Line];
	if (allowedEdgeTypes.includes(entity.getType())) {
		return { entity, segmentIndex: 0, edge: entity as CornerEdgeEntity, clickPoint };
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
	if (!segment || !allowedEdgeTypes.includes(segment.getType())) {
		return null;
	}
	// Unique id per segment, so two segments of the same rectangle count as different lines
	segment.id = `${entity.id}-${closestIndex}`;
	return {
		entity,
		segmentIndex: closestIndex,
		edge: segment as CornerEdgeEntity,
		clickPoint,
	};
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
	corner: { edges: [CornerEdgeEntity, CornerEdgeEntity]; connector: Entity | null }
): Entity[] {
	const [firstLine, secondLine] = corner.edges;
	const isSameMultiSegmentEntity =
		first.entity.id === second.entity.id && !SINGLE_EDGE_TYPES.includes(first.entity.getType());

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
		if (SINGLE_EDGE_TYPES.includes(target.entity.getType())) {
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

/**
 * The full line or circle an edge lies on
 */
type BaseCurve = Line | Circle;

function getBaseCurve(edge: CornerEdgeEntity): BaseCurve {
	if (edge.getType() === EntityName.Line) {
		const segment = edge.getShape() as Segment;
		return new Line(segment.start, segment.end);
	}
	const arc = edge.getShape() as Arc;
	return new Circle(arc.center, arc.r.valueOf());
}

/**
 * The curves at the given distance from the edge, the center of a fillet arc lies on one of them
 * - line: the 2 parallel lines
 * - arc: the 2 concentric circles
 */
function getOffsetCurves(edge: CornerEdgeEntity, distance: number): BaseCurve[] {
	const base = getBaseCurve(edge);
	if (base instanceof Line) {
		return [
			base.translate(base.norm.multiply(distance)),
			base.translate(base.norm.multiply(-distance)),
		];
	}
	const radius = base.r.valueOf();
	const curves = [new Circle(base.pc, radius + distance)];
	if (Math.abs(radius - distance) > EPSILON) {
		curves.push(new Circle(base.pc, Math.abs(radius - distance)));
	}
	return curves;
}

function intersectCurves(first: BaseCurve, second: BaseCurve): Point[] {
	return first instanceof Line ? first.intersect(second) : first.intersect(second);
}

/**
 * Point where a fillet arc with the given center and radius touches the edge
 */
function getTangentPoint(edge: CornerEdgeEntity, center: Point, radius: number): Point {
	const base = getBaseCurve(edge);
	if (base instanceof Line) {
		return center.projectionOn(base);
	}
	const direction = new Vector(base.pc, center).normalize();
	const candidates = [
		base.pc.translate(direction.multiply(base.r.valueOf())),
		base.pc.translate(direction.multiply(-base.r.valueOf())),
	];
	return candidates.reduce((best, candidate) =>
		Math.abs(candidate.distanceTo(center)[0] - radius) <
		Math.abs(best.distanceTo(center)[0] - radius)
			? candidate
			: best
	);
}

function getAngle(center: Point, point: Point): number {
	return Math.atan2(point.y - center.y, point.x - center.x);
}

/**
 * Angle swept when going from one angle to another in the given direction, between 0 and 2π
 */
function getSweep(fromAngle: number, toAngle: number, counterClockwise: boolean): number {
	const sweep = counterClockwise ? toAngle - fromAngle : fromAngle - toAngle;
	return ((sweep % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * Unit vector along the circle in the direction of travel
 */
function getCircleTangent(center: Point, point: Point, counterClockwise: boolean): Vector {
	const tangent = new Vector(-(point.y - center.y), point.x - center.x).normalize();
	return counterClockwise ? tangent : tangent.multiply(-1);
}

interface KeptEdge {
	entity: CornerEdgeEntity;
	/**
	 * Length of the kept edge, used to choose the smallest change if multiple corners are possible
	 */
	length: number;
}

/**
 * Trims or extends the edge, so it ends in the corner point
 * The kept part leaves the corner point in the outward direction
 * If requireClick is true, the kept part has to contain the click point, otherwise null is returned
 * An arc is only extended over the shortest way to the corner point, otherwise null is returned
 * The edge keeps its id and its direction
 */
function keepEdge(
	target: CornerLine,
	cornerPoint: Point,
	outward: Vector,
	requireClick = true
): KeptEdge | null {
	const { edge, clickPoint } = target;
	if (edge.getType() === EntityName.Line) {
		const segment = edge.getShape() as Segment;
		const base = new Line(segment.start, segment.end);
		const clickAlong = new Vector(cornerPoint, clickPoint.projectionOn(base)).dot(outward);
		const startAlong = new Vector(cornerPoint, segment.start).dot(outward);
		const endAlong = new Vector(cornerPoint, segment.end).dot(outward);
		const length = Math.max(startAlong, endAlong);
		if ((requireClick && clickAlong <= EPSILON) || length <= EPSILON) {
			return null;
		}
		const entity =
			startAlong >= endAlong
				? createLineLike(edge, segment.start, cornerPoint)
				: createLineLike(edge, cornerPoint, segment.end);
		return { entity, length };
	}

	const arc = edge.getShape() as Arc;
	const center = arc.center;
	const radius = arc.r.valueOf();
	// Direction of travel along the circle, away from the corner
	const travelCounterClockwise = new Vector(center, cornerPoint).cross(outward) > 0;
	// The kept end is the end of the arc that is reached when traveling from the click point away from the corner
	const keepsEnd = travelCounterClockwise === arc.counterClockwise;
	const keptAngle = keepsEnd ? arc.endAngle : arc.startAngle;
	const cornerAngle = getAngle(center, cornerPoint);
	const clickSweep = getSweep(cornerAngle, getAngle(center, clickPoint), travelCounterClockwise);
	const keptSweep = getSweep(cornerAngle, keptAngle, travelCounterClockwise);
	if (requireClick && (clickSweep <= EPSILON || clickSweep >= keptSweep - EPSILON)) {
		return null;
	}
	const originalSweep = arc.sweep;
	const extension = keptSweep - originalSweep;
	if (keptSweep <= EPSILON || extension > (2 * Math.PI - originalSweep) / 2 + EPSILON) {
		return null;
	}
	const newArc = keepsEnd
		? new ArcEntity(center, radius, cornerAngle, keptAngle, arc.counterClockwise)
		: new ArcEntity(center, radius, keptAngle, cornerAngle, arc.counterClockwise);
	const entity = copyEntityBaseProperties(edge, newArc);
	entity.id = edge.id;
	return { entity, length: keptSweep * radius };
}

interface ArcCornerCandidate {
	edges: [CornerEdgeEntity, CornerEdgeEntity];
	connector: Entity | null;
	/**
	 * Lower is better
	 */
	score: number[];
}

function compareScores(first: number[], second: number[]): number {
	for (let index = 0; index < first.length; index++) {
		if (Math.abs(first[index] - second[index]) > 1e-6) {
			return first[index] - second[index];
		}
	}
	return 0;
}

/**
 * Fillets or chamfers two edges where at least one is an arc
 * - fillet: the fillet arc touches both edges, every combination of offset curves gives possible centers
 *   the chosen fillet is the one that touches the edges closest to the click points
 * - chamfer: both edges are cut off at the given straight distance from the corner where they meet
 * - a value of 0 trims or extends both edges to the corner where they meet
 * For a chamfer or a value of 0, the parts of the edges where the user clicked are kept
 */
function createArcCorner(
	first: CornerLine,
	second: CornerLine,
	cornerType: CornerType,
	value: number
): CornerResult {
	const candidates: ArcCornerCandidate[] = [];
	let isTooLarge = false;

	if (value <= 0 || cornerType === CornerType.CHAMFER) {
		const chamferDistance = Math.max(0, value);
		const firstBase = getBaseCurve(first.edge);
		const secondBase = getBaseCurve(second.edge);
		for (const corner of intersectCurves(firstBase, secondBase)) {
			const distance =
				corner.distanceTo(first.clickPoint)[0] + corner.distanceTo(second.clickPoint)[0];
			const firstOptions = getKeptOptions(first, corner);
			const secondOptions = getKeptOptions(second, corner);
			for (const firstOption of firstOptions) {
				for (const secondOption of secondOptions) {
					const score = [distance, firstOption.kept.length + secondOption.kept.length];
					if (!chamferDistance) {
						candidates.push({
							edges: [firstOption.kept.entity, secondOption.kept.entity],
							connector: null,
							score,
						});
						continue;
					}
					const firstCut = moveAlongEdge(first.edge, corner, firstOption.outward, chamferDistance);
					const secondCut = moveAlongEdge(
						second.edge,
						corner,
						secondOption.outward,
						chamferDistance
					);
					// The clicks were checked at the corner, they can be on the part that is cut off
					const firstKept = firstCut && keepEdge(first, firstCut.point, firstCut.outward, false);
					const secondKept =
						secondCut && keepEdge(second, secondCut.point, secondCut.outward, false);
					if (
						!firstKept ||
						!secondKept ||
						firstKept.length >= firstOption.kept.length ||
						secondKept.length >= secondOption.kept.length
					) {
						isTooLarge = true;
						continue;
					}
					candidates.push({
						edges: [firstKept.entity, secondKept.entity],
						connector: copyEntityBaseProperties(
							first.edge,
							new LineEntity(firstCut.point, secondCut.point)
						),
						score,
					});
				}
			}
		}
	} else {
		const radius = value;
		for (const firstOffset of getOffsetCurves(first.edge, radius)) {
			for (const secondOffset of getOffsetCurves(second.edge, radius)) {
				for (const center of intersectCurves(firstOffset, secondOffset)) {
					const firstEnd = getTangentPoint(first.edge, center, radius);
					const secondEnd = getTangentPoint(second.edge, center, radius);
					if (firstEnd.equalTo(secondEnd)) {
						continue;
					}
					const startAngle = getAngle(center, firstEnd);
					const endAngle = getAngle(center, secondEnd);
					for (const counterClockwise of [true, false]) {
						// The edges continue the fillet arc, so they leave it along its tangents
						const firstKept = keepEdge(
							first,
							firstEnd,
							getCircleTangent(center, firstEnd, counterClockwise).multiply(-1),
							false
						);
						const secondKept = keepEdge(
							second,
							secondEnd,
							getCircleTangent(center, secondEnd, counterClockwise),
							false
						);
						if (!firstKept || !secondKept) {
							continue;
						}
						const sweep = getSweep(startAngle, endAngle, counterClockwise);
						candidates.push({
							edges: [firstKept.entity, secondKept.entity],
							connector: copyEntityBaseProperties(
								first.edge,
								new ArcEntity(center, radius, startAngle, endAngle, counterClockwise)
							),
							score: [
								firstEnd.distanceTo(first.clickPoint)[0] +
									secondEnd.distanceTo(second.clickPoint)[0],
								sweep,
							],
						});
					}
				}
			}
		}
	}

	const best = candidates.sort((a, b) => compareScores(a.score, b.score))[0];
	if (!best) {
		if (isTooLarge) {
			return { error: 'The distance is too large for these edges' };
		}
		if (value <= 0) {
			return { error: 'The edges have no corner, click the parts you want to keep' };
		}
		return {
			error:
				cornerType === CornerType.FILLET
					? 'No fillet with this radius fits, click the parts of the edges you want to keep'
					: 'The edges have no corner, click the parts you want to keep',
		};
	}
	return { edges: best.edges, connector: best.connector };
}

/**
 * Both directions along the edge at the given point
 */
function getOutwardOptions(edge: CornerEdgeEntity, point: Point): Vector[] {
	let direction: Vector;
	if (edge.getType() === EntityName.Line) {
		const segment = edge.getShape() as Segment;
		direction = new Vector(segment.start, segment.end).normalize();
	} else {
		direction = getCircleTangent((edge.getShape() as Arc).center, point, true);
	}
	return [direction, direction.multiply(-1)];
}

interface KeptOption {
	/**
	 * Direction from the corner along the kept part of the edge
	 */
	outward: Vector;
	kept: KeptEdge;
}

/**
 * The ways the edge can be trimmed or extended to the corner while keeping the clicked part
 */
function getKeptOptions(target: CornerLine, corner: Point): KeptOption[] {
	return getOutwardOptions(target.edge, corner).flatMap((outward) => {
		const kept = keepEdge(target, corner, outward);
		return kept ? [{ outward, kept }] : [];
	});
}

/**
 * Point on the edge at the given straight distance from the start point, in the outward direction
 * For an arc this is a chord, returns null if the distance is larger than the diameter
 */
function moveAlongEdge(
	edge: CornerEdgeEntity,
	start: Point,
	outward: Vector,
	distance: number
): { point: Point; outward: Vector } | null {
	if (edge.getType() === EntityName.Line) {
		return { point: start.translate(outward.multiply(distance)), outward };
	}
	const arc = edge.getShape() as Arc;
	const radius = arc.r.valueOf();
	if (distance > 2 * radius) {
		return null;
	}
	const counterClockwise = new Vector(arc.center, start).cross(outward) > 0;
	const sweep = 2 * Math.asin(distance / (2 * radius));
	const angle = getAngle(arc.center, start) + (counterClockwise ? sweep : -sweep);
	const point = arc.center.translate(
		new Vector(Math.cos(angle) * radius, Math.sin(angle) * radius)
	);
	return { point, outward: getCircleTangent(arc.center, point, counterClockwise) };
}
