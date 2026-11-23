import { Arc, Point, Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import { toast } from 'react-toastify';
import type { Layer } from '../../App.types.ts';
import { ArcEntity, type ArcJsonData } from '../../entities/ArcEntity';
import { ArrowHeadEntity, type ArrowHeadJsonData } from '../../entities/ArrowHeadEntity.ts';
import { CircleEntity, type CircleJsonData } from '../../entities/CircleEntity';
import { EllipseEntity, type EllipseJsonData } from '../../entities/EllipseEntity.ts';
import { type Entity, EntityName, type JsonEntity } from '../../entities/Entity';
import { FillEntity, type FillJsonData } from '../../entities/FillEntity.ts';
import { GroupEntity, type GroupJsonData } from '../../entities/GroupEntity.ts';
import { ImageEntity, type ImageJsonData } from '../../entities/ImageEntity.ts';
import { LineEntity, type LineJsonData } from '../../entities/LineEntity';
import { MeasurementEntity, type MeasurementJsonData } from '../../entities/MeasurementEntity.ts';
import { PointEntity, type PointJsonData } from '../../entities/PointEntity';
import { PolyLineEntity, type PolyLineJsonData } from '../../entities/PolyLineEntity.ts';
import { RectangleEntity, type RectangleJsonData } from '../../entities/RectangleEntity';
import { SplineEntity, type SplineJsonData } from '../../entities/SplineEntity.ts';
import { TextEntity, type TextJsonData } from '../../entities/TextEntity.ts';
import { setActiveLayerId, setEntities, setLayers } from '../../state';
import { zoomToBounds } from '../../tools/zoom-tool.helpers.ts';
import { getNewLayer } from '../get-new-layer.ts';
import type {
	ArcRawJson,
	JsonDrawingFileDeserialized,
	JsonDrawingFileSerialized,
	SegmentRawJson,
} from './json.types.ts';

/**
 * Parse the JSON file selected in the file dialog
 * Generate entities from the JSON data
 * Replace the drawing with the entities and layers of the file
 */
export async function importEntitiesFromJsonFile(file: File | null | undefined): Promise<void> {
	if (!file) {
		return;
	}
	try {
		const drawing = await getEntitiesAndLayersFromJsonString(await file.text());
		if (drawing.skippedEntityCount) {
			toast.warning(`${drawing.skippedEntityCount} entities in the file could not be loaded`);
		}
		setEntities(drawing.entities);
		setLayers(drawing.layers, true, true);
		setActiveLayerId(getDefaultActiveLayerId(drawing.layers));
		zoomToBounds();
	} catch (error) {
		console.error('Failed to load the JSON file', error);
		toast.error('The JSON file could not be loaded. See console for details.');
	}
}

/**
 * Layer to draw on after loading a drawing: the first layer that is visible and unlocked,
 * since new entities on a hidden or locked layer can't be seen or changed
 */
export function getDefaultActiveLayerId(layers: Layer[]): string {
	return (layers.find((layer) => layer.isVisible && !layer.isLocked) ?? layers[0]).id;
}

/**
 * Entities on a layer that doesn't exist are saved, but never drawn and can't be selected,
 * so every missing layer is added as a new visible and unlocked layer
 */
function addMissingLayers(entities: Entity[], layers: Layer[]): Layer[] {
	const allLayers = [...layers];
	const layerIds = new Set(layers.map((layer) => layer.id));
	const addedLayerIds = new Map<string, string>();
	for (const entity of entities) {
		if (layerIds.has(entity.layerId)) {
			continue;
		}
		let layerId = addedLayerIds.get(entity.layerId);
		if (!layerId) {
			// The layer keeps the id of the entities, unless they have no layer id at all
			const layer: Layer = {
				...getNewLayer(allLayers),
				...(entity.layerId ? { id: entity.layerId } : {}),
			};
			allLayers.push(layer);
			addedLayerIds.set(entity.layerId, layer.id);
			layerId = layer.id;
		}
		entity.layerId = layerId;
	}
	return allLayers;
}

/**
 * Converts the json of an entity in the open web cad format into an entity
 */
export function entityFromJson(entity: JsonEntity): Promise<Entity | null> {
	switch (entity.type) {
		case EntityName.Arc:
			return ArcEntity.fromJson(entity as JsonEntity<ArcJsonData>);
		case EntityName.Circle:
			return CircleEntity.fromJson(entity as JsonEntity<CircleJsonData>);
		case EntityName.Line:
			return LineEntity.fromJson(entity as JsonEntity<LineJsonData>);
		case EntityName.Point:
			return PointEntity.fromJson(entity as JsonEntity<PointJsonData>);
		case EntityName.Rectangle:
			return RectangleEntity.fromJson(entity as JsonEntity<RectangleJsonData>);
		case EntityName.Text:
			return TextEntity.fromJson(entity as JsonEntity<TextJsonData>);
		case EntityName.Measurement:
			return MeasurementEntity.fromJson(entity as JsonEntity<MeasurementJsonData>);
		case EntityName.Image:
			return ImageEntity.fromJson(entity as JsonEntity<ImageJsonData>);
		case EntityName.PolyLine:
			return PolyLineEntity.fromJson(entity as JsonEntity<PolyLineJsonData>);
		case EntityName.Fill:
			return FillEntity.fromJson(entity as JsonEntity<FillJsonData>);
		case EntityName.Ellipse:
			return EllipseEntity.fromJson(entity as JsonEntity<EllipseJsonData>);
		case EntityName.Spline:
			return SplineEntity.fromJson(entity as JsonEntity<SplineJsonData>);
		case EntityName.ArrowHead:
			return ArrowHeadEntity.fromJson(entity as JsonEntity<ArrowHeadJsonData>);
		case EntityName.Group:
			return GroupEntity.fromJson(entity as JsonEntity<GroupJsonData>, entityFromJson);

		default:
			throw new Error(`Invalid entity type: ${entity.type}`);
	}
}

export async function getEntitiesAndLayersFromJsonObject(
	data: JsonDrawingFileSerialized
): Promise<JsonDrawingFileDeserialized> {
	let entities: Entity[];
	let layers: Layer[];
	let skippedEntityCount = 0;
	if (Array.isArray(data)) {
		// raw flatten js json array of segments and arcs
		// Useful when debugging segments and arcs that were copied out of the dev tools
		layers = [getNewLayer([])];
		entities = compact(
			data.map((entityRawJson) => {
				switch (entityRawJson.name) {
					case 'segment': {
						const segmentRawJson = entityRawJson as SegmentRawJson;
						const line = new LineEntity(
							new Segment(
								new Point(segmentRawJson.ps.x, segmentRawJson.ps.y),
								new Point(segmentRawJson.pe.x, segmentRawJson.pe.y)
							)
						);
						line.layerId = layers[0].id;
						return line;
					}
					case 'arc': {
						const arcRawJson = entityRawJson as ArcRawJson;
						const arc = new ArcEntity(
							new Arc(
								new Point(arcRawJson.pc.x, arcRawJson.pc.y),
								arcRawJson.r,
								arcRawJson.startAngle,
								arcRawJson.endAngle,
								arcRawJson.counterClockwise
							)
						);

						arc.layerId = layers[0].id;
						return arc;
					}
					default: {
						console.error(
							'Failed to import entity from raw flatten js json file. Only segment and arc are supported',
							entityRawJson
						);
						return null;
					}
				}
			})
		);
	} else {
		// open web cad format
		if (!Array.isArray(data?.entities)) {
			throw new Error('Invalid json file, it has no list of entities');
		}
		// One entity that can't be loaded shouldn't lose the rest of the drawing
		const entityPromises = data.entities.map(async (jsonEntity) => {
			try {
				return await entityFromJson(jsonEntity);
			} catch (error) {
				console.error('Failed to load entity', { jsonEntity, error });
				skippedEntityCount++;
				return null;
			}
		});
		entities = compact(await Promise.all(entityPromises));
		layers = Array.isArray(data.layers) && data.layers.length ? data.layers : [getNewLayer([])];
		layers = addMissingLayers(entities, layers);
	}

	return {
		entities,
		layers,
		skippedEntityCount,
	};
}

export async function getEntitiesAndLayersFromJsonString(
	json: string
): Promise<JsonDrawingFileDeserialized> {
	const data = JSON.parse(json) as JsonDrawingFileSerialized;

	// TODO use map limit to avoid overloading the event loop
	const parsedDrawing = await getEntitiesAndLayersFromJsonObject(data);

	if (parsedDrawing.entities.length === 0 && parsedDrawing.layers.length === 0) {
		throw new Error('Invalid json file, no entities/layers found');
	}

	return parsedDrawing;
}
