import { MEASUREMENT_FONT_SIZE } from '../App.consts.ts';
import type { Entity } from '../entities/Entity';
import { EntityName } from '../entities/Entity';
import type { GroupEntity } from '../entities/GroupEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import type { MeasurementEntity } from '../entities/MeasurementEntity.ts';
import type { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { TextEntity } from '../entities/TextEntity.ts';
import { copyEntityBaseProperties } from './copy-entity-base-properties.ts';

/**
 * Splits an entity into simpler entities
 * - polyline => lines and arcs
 * - rectangle => 4 lines
 * - group => its members
 * - measurement => lines and a text
 * Returns null if the entity can't be split
 */
export function explodeEntity(entity: Entity): Entity[] | null {
	switch (entity.getType()) {
		case EntityName.PolyLine:
			return (entity as PolyLineEntity).entities.map((child) =>
				copyEntityBaseProperties(entity, child.clone())
			);

		case EntityName.Rectangle:
			return entity
				.getEdges()
				.map((edge) => copyEntityBaseProperties(entity, new LineEntity(edge.start, edge.end)));

		case EntityName.Group:
			return (entity as GroupEntity).entities.map((child) => child.clone());

		case EntityName.Measurement:
			return explodeMeasurement(entity as MeasurementEntity);

		default:
			return null;
	}
}

function explodeMeasurement(measurement: MeasurementEntity): Entity[] | null {
	const drawPoints = measurement.getDrawPoints();
	if (!drawPoints) {
		return null;
	}
	const lines = [
		new LineEntity(drawPoints.offsetStartPoint, drawPoints.offsetEndPoint),
		new LineEntity(drawPoints.offsetStartPointMargin, drawPoints.offsetStartPointExtend),
		new LineEntity(drawPoints.offsetEndPointMargin, drawPoints.offsetEndPointExtend),
	];
	const label = measurement.getLabel(drawPoints);
	const text = new TextEntity(label.text, label.basePoint, {
		textAlign: 'center',
		textDirection: label.textDirection,
		fontSize: MEASUREMENT_FONT_SIZE,
	});
	return [...lines, text].map((entity) => copyEntityBaseProperties(measurement, entity));
}

/**
 * Replaces the entities that can be exploded by their parts, at the same position in the drawing order
 */
export function explodeEntities(
	selectedEntities: Entity[],
	entities: Entity[]
): { entities: Entity[]; explodedEntities: Entity[] } {
	const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
	const explodedEntities: Entity[] = [];
	const newEntities = entities.flatMap((entity) => {
		if (!selectedIds.has(entity.id)) {
			return [entity];
		}
		const parts = explodeEntity(entity);
		if (!parts) {
			return [entity];
		}
		explodedEntities.push(...parts);
		return parts;
	});
	return { entities: newEntities, explodedEntities };
}
