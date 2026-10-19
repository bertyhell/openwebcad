import { type Arc, type Box, Point } from '@flatten-js/core';
import type { ArcEntity } from '../entities/ArcEntity.ts';
import { type Entity, EntityName } from '../entities/Entity';
import { GroupEntity } from '../entities/GroupEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { SplineEntity } from '../entities/SplineEntity.ts';
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
 * Moves the parts of the entity that are inside the box, the parts outside the box stay where they are
 * - line, arc and polyline: the end points inside the box move
 * - rectangle: becomes a polyline when only some of its corners are inside the box
 * - spline: the fit points inside the box move
 * - other entities only move when they are completely inside the box
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

		default:
			return entity.clone();
	}
}
