import { type Arc, type Box, Point, Vector } from '@flatten-js/core';
import type { ArcEntity } from '../entities/ArcEntity.ts';
import type { CircleEntity } from '../entities/CircleEntity.ts';
import type { EllipseEntity } from '../entities/EllipseEntity.ts';
import { type Entity, EntityName } from '../entities/Entity';
import { GroupEntity } from '../entities/GroupEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { MeasurementEntity } from '../entities/MeasurementEntity.ts';
import type { PointEntity } from '../entities/PointEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { SplineEntity } from '../entities/SplineEntity.ts';
import type { TextEntity } from '../entities/TextEntity.ts';
import { getArcThroughPoints } from './arc-through-points.ts';
import { copyEntityBaseProperties } from './copy-entity-base-properties.ts';

function movePointIfInside(point: Point, box: Box, deltaX: number, deltaY: number): Point {
	return box.contains(point) ? new Point(point.x + deltaX, point.y + deltaY) : point;
}

function stretchLine(line: LineEntity, box: Box, deltaX: number, deltaY: number): LineEntity {
	const stretchedLine = new LineEntity(
		movePointIfInside(line.getStartPoint(), box, deltaX, deltaY),
		movePointIfInside(line.getEndPoint(), box, deltaX, deltaY)
	);
	return copyEntityBaseProperties(line, stretchedLine);
}

/**
 * An arc with one end inside the box keeps its other end, the point halfway the arc moves half the distance
 */
function stretchArc(arc: ArcEntity, box: Box, deltaX: number, deltaY: number): Entity {
	const startInside = box.contains(arc.getStartPoint());
	const endInside = box.contains(arc.getEndPoint());
	if (startInside === endInside) {
		const clone = arc.clone();
		if (startInside) {
			clone.move(deltaX, deltaY);
		}
		return clone;
	}
	const middle = (arc.getShape() as Arc).middle();
	const stretchedArc = getArcThroughPoints(
		movePointIfInside(arc.getStartPoint(), box, deltaX, deltaY),
		new Point(middle.x + deltaX / 2, middle.y + deltaY / 2),
		movePointIfInside(arc.getEndPoint(), box, deltaX, deltaY)
	);
	return stretchedArc ? copyEntityBaseProperties(arc, stretchedArc) : arc.clone();
}

function moveClone(entity: Entity, deltaX: number, deltaY: number): Entity {
	const clone = entity.clone();
	clone.move(deltaX, deltaY);
	return clone;
}

/**
 * The point that decides if an entity without end points to stretch moves, like in AutoCAD:
 * - circle and ellipse: the center
 * - text and point: the insertion point
 * - image: the insertion point, the first corner of the image
 * - fill: the middle of the fill, a fill has no insertion point
 * Returns null for entities that are stretched by their end points
 */
function getStretchReferencePoint(entity: Entity): Point | null {
	switch (entity.getType()) {
		case EntityName.Circle:
			return (entity as CircleEntity).getCenter();
		case EntityName.Ellipse:
			return (entity as EllipseEntity).getCenter();
		case EntityName.Text:
			return (entity as TextEntity).getBasePoint();
		case EntityName.Point:
			return (entity as PointEntity).point;
		case EntityName.Image:
			return entity.getFirstPoint();
		case EntityName.Fill: {
			const boundingBox = entity.getBoundingBox();
			return new Point(
				(boundingBox.xmin + boundingBox.xmax) / 2,
				(boundingBox.ymin + boundingBox.ymax) / 2
			);
		}
		default:
			return null;
	}
}

interface MeasurementPoints {
	startPoint: Point;
	endPoint: Point;
	/**
	 * Points on the dimension line: its two ends and its middle
	 */
	dimensionLinePoints: [Point, Point, Point];
}

/**
 * The points of a measurement that can be stretched
 * The end point and the offset point aren't public, but they follow from the dimension line,
 * which is the measured line moved by the offset
 * Returns null for a measurement without a length, it has no dimension line
 */
function getMeasurementPoints(measurement: MeasurementEntity): MeasurementPoints | null {
	const drawPoints = measurement.getDrawPoints();
	const startPoint = measurement.getFirstPoint();
	if (!drawPoints || !startPoint) {
		return null;
	}
	const offset = new Vector(startPoint, drawPoints.offsetStartPoint);
	const { offsetStartPoint, offsetEndPoint } = drawPoints;
	return {
		startPoint,
		endPoint: offsetEndPoint.translate(offset.invert()),
		dimensionLinePoints: [
			offsetEndPoint,
			offsetStartPoint,
			new Point(
				(offsetStartPoint.x + offsetEndPoint.x) / 2,
				(offsetStartPoint.y + offsetEndPoint.y) / 2
			),
		],
	};
}

/**
 * Moves the start and end point of the measurement that are inside the box, so a dimension follows a stretched wall
 * The dimension line moves when the box covers one of its ends or its middle
 * The offset point the user clicked can't be read, but every point on the dimension line gives the same measurement
 */
function stretchMeasurement(
	measurement: MeasurementEntity,
	box: Box,
	deltaX: number,
	deltaY: number
): Entity {
	const points = getMeasurementPoints(measurement);
	if (!points) {
		return measurement.clone();
	}
	const [, , dimensionLineMiddle] = points.dimensionLinePoints;
	const dimensionLinePoint =
		points.dimensionLinePoints.find((point) => box.contains(point)) ?? dimensionLineMiddle;
	const stretchedMeasurement = new MeasurementEntity(
		movePointIfInside(points.startPoint, box, deltaX, deltaY),
		movePointIfInside(points.endPoint, box, deltaX, deltaY),
		movePointIfInside(dimensionLinePoint, box, deltaX, deltaY)
	);
	return copyEntityBaseProperties(measurement, stretchedMeasurement);
}

/**
 * The stretch window picks entities that it crosses or contains, and entities whose
 * center, insertion point or measured points are inside it, since those move too
 */
export function isEntityInStretchWindow(entity: Entity, box: Box): boolean {
	if (entity.intersectsWithBox(box) || entity.isContainedInBox(box)) {
		return true;
	}
	const referencePoint = getStretchReferencePoint(entity);
	if (referencePoint) {
		return box.contains(referencePoint);
	}
	if (entity.getType() === EntityName.Measurement) {
		const points = getMeasurementPoints(entity as MeasurementEntity);
		return (
			!!points &&
			[points.startPoint, points.endPoint, ...points.dimensionLinePoints].some((point) =>
				box.contains(point)
			)
		);
	}
	if (entity.getType() === EntityName.Group) {
		return (entity as GroupEntity).entities.some((child) => isEntityInStretchWindow(child, box));
	}
	return false;
}

/**
 * Moves the parts of the entity that are inside the box, the parts outside the box stay where they are
 * - line, arc and polyline: the end points inside the box move
 * - rectangle: becomes a polyline when only some of its corners are inside the box
 * - spline: the fit points inside the box move
 * - measurement: the measured points and the dimension line inside the box move
 * - circle, ellipse, text, point, image and fill: move when their center or insertion point is inside the box
 */
export function stretchEntity(entity: Entity, box: Box, deltaX: number, deltaY: number): Entity {
	if (entity.isContainedInBox(box)) {
		return moveClone(entity, deltaX, deltaY);
	}
	switch (entity.getType()) {
		case EntityName.Line:
			return stretchLine(entity as LineEntity, box, deltaX, deltaY);

		case EntityName.Arc:
			return stretchArc(entity as ArcEntity, box, deltaX, deltaY);

		case EntityName.PolyLine: {
			const polyLine = entity as PolyLineEntity;
			const stretchedPolyLine = new PolyLineEntity(
				polyLine.entities.map((child) => stretchEntity(child, box, deltaX, deltaY))
			);
			return copyEntityBaseProperties(polyLine, stretchedPolyLine);
		}

		case EntityName.Rectangle: {
			const corners = entity.getEdges().map((edge) => edge.start);
			if (!corners.some((corner) => box.contains(corner))) {
				return entity.clone();
			}
			const movedCorners = corners.map((corner) => movePointIfInside(corner, box, deltaX, deltaY));
			const polyLine = new PolyLineEntity(
				movedCorners.map(
					(corner, index) => new LineEntity(corner, movedCorners[(index + 1) % movedCorners.length])
				)
			);
			return copyEntityBaseProperties(entity, polyLine);
		}

		case EntityName.Spline: {
			const spline = entity as SplineEntity;
			const stretchedSpline = new SplineEntity(
				spline.getFitPoints().map((point) => movePointIfInside(point, box, deltaX, deltaY))
			);
			return copyEntityBaseProperties(spline, stretchedSpline);
		}

		case EntityName.Group: {
			const group = entity as GroupEntity;
			const stretchedGroup = new GroupEntity(
				group.entities.map((child) => stretchEntity(child, box, deltaX, deltaY))
			);
			stretchedGroup.layerId = group.layerId;
			return stretchedGroup;
		}

		case EntityName.Measurement:
			return stretchMeasurement(entity as MeasurementEntity, box, deltaX, deltaY);

		default: {
			const referencePoint = getStretchReferencePoint(entity);
			return referencePoint && box.contains(referencePoint)
				? moveClone(entity, deltaX, deltaY)
				: entity.clone();
		}
	}
}
