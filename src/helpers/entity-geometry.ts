import { type Arc, type Circle, Point, type Segment } from '@flatten-js/core';
import { ArcEntity } from '../entities/ArcEntity';
import { CircleEntity } from '../entities/CircleEntity';
import { type Entity, EntityName } from '../entities/Entity';
import { LineEntity } from '../entities/LineEntity';
import { TextEntity } from '../entities/TextEntity';
import { copyEntityBaseProperties } from './copy-entity-base-properties';

export interface XY {
	x: number;
	y: number;
}

/**
 * Geometry of an entity that can be edited with numbers in the properties panel
 */
export type EntityGeometry =
	| { type: EntityName.Line; start: XY; end: XY }
	| { type: EntityName.Circle; center: XY; radius: number }
	| { type: EntityName.Arc; center: XY; radius: number }
	| { type: EntityName.Text; basePoint: XY; label: string; height: number };

const toXY = (point: Point): XY => ({ x: point.x, y: point.y });
const toPoint = (xy: XY): Point => new Point(xy.x, xy.y);

/**
 * The editable geometry of the entity, or null for entities that don't support editing their geometry
 */
export function getEntityGeometry(entity: Entity): EntityGeometry | null {
	switch (entity.getType()) {
		case EntityName.Line: {
			const segment = entity.getShape() as Segment;
			return { type: EntityName.Line, start: toXY(segment.start), end: toXY(segment.end) };
		}
		case EntityName.Circle: {
			const circle = entity.getShape() as Circle;
			return { type: EntityName.Circle, center: toXY(circle.center), radius: circle.r.valueOf() };
		}
		case EntityName.Arc: {
			const arc = entity.getShape() as Arc;
			return { type: EntityName.Arc, center: toXY(arc.center), radius: arc.r.valueOf() };
		}
		case EntityName.Text: {
			const text = entity as TextEntity;
			return {
				type: EntityName.Text,
				basePoint: toXY(text.getBasePoint()),
				label: text.getLabel(),
				height: text.getFontSize(),
			};
		}
		default:
			return null;
	}
}

/**
 * Creates a copy of the entity with the new geometry, it keeps the id and style, so it can replace the entity
 * Returns null when the geometry is invalid, eg: a negative radius
 */
export function withEntityGeometry(entity: Entity, geometry: EntityGeometry): Entity | null {
	let updatedEntity: Entity | null = null;
	switch (geometry.type) {
		case EntityName.Line:
			updatedEntity = new LineEntity(toPoint(geometry.start), toPoint(geometry.end));
			break;
		case EntityName.Circle:
			if (geometry.radius > 0) {
				updatedEntity = new CircleEntity(toPoint(geometry.center), geometry.radius);
			}
			break;
		case EntityName.Arc: {
			const arc = entity.getShape() as Arc;
			if (geometry.radius > 0) {
				updatedEntity = new ArcEntity(
					toPoint(geometry.center),
					geometry.radius,
					arc.startAngle,
					arc.endAngle,
					arc.counterClockwise
				);
			}
			break;
		}
		case EntityName.Text:
			if (geometry.label.trim() && geometry.height > 0) {
				updatedEntity = new TextEntity(geometry.label, toPoint(geometry.basePoint), {
					...(entity as TextEntity).getOptions(),
					fontSize: geometry.height,
				});
			}
			break;
	}
	if (!updatedEntity) {
		return null;
	}
	copyEntityBaseProperties(entity, updatedEntity);
	updatedEntity.id = entity.id;
	return updatedEntity;
}
