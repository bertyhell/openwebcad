import {Arc, Point, Segment} from '@flatten-js/core';
import {compact} from 'es-toolkit';
import type {Layer} from '../../App.types.ts';
import {ArcEntity, type ArcJsonData} from '../../entities/ArcEntity';
import {CircleEntity, type CircleJsonData} from '../../entities/CircleEntity';
import {type Entity, EntityName, type JsonEntity} from '../../entities/Entity';
import {ImageEntity, type ImageJsonData} from '../../entities/ImageEntity.ts';
import {LineEntity, type LineJsonData} from '../../entities/LineEntity';
import {MeasurementEntity, type MeasurementJsonData} from '../../entities/MeasurementEntity.ts';
import {PointEntity, type PointJsonData} from '../../entities/PointEntity';
import {PolyLineEntity, type PolyLineJsonData} from '../../entities/PolyLineEntity.ts';
import {RectangleEntity, type RectangleJsonData} from '../../entities/RectangleEntity';
import {TextEntity, type TextJsonData} from '../../entities/TextEntity.ts';
import {setActiveLayerId, setEntities, setLayers} from '../../state';
import {getNewLayer} from '../get-new-layer.ts';
import type {ArcRawJson, JsonDrawingFileDeserialized, JsonDrawingFileSerialized, SegmentRawJson,} from './json.types.ts';

/**
 * Open a file selection dialog to select *.json files
 * Parse the JSON file
 * Generate entities from the JSON data
 * Set the entities in the state
 */
export function importEntitiesFromJsonFile(file: File | null | undefined) {
	return new Promise<void>((resolve) => {
		if (!file) return;

		const reader = new FileReader();
		reader.addEventListener('load', async () => {
			const json = reader.result as string;
			const file = await getEntitiesAndLayersFromJsonString(json);
			setEntities(file.entities);
			setLayers(file.layers);
			setActiveLayerId(file.layers[0].id);
			resolve();
		});
		reader.readAsText(file, 'utf-8');
	});
}

export async function getEntitiesAndLayersFromJsonObject(
	data: JsonDrawingFileSerialized
): Promise<JsonDrawingFileDeserialized> {
	let entities: Entity[];
	let layers: Layer[];
	if (Array.isArray(data)) {
		// raw flatten js json array of segments and arcs
		// Useful when debugging segments and arcs that were copied out of the dev tools
		layers = [getNewLayer()];
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
		const entityPromises: Promise<Entity | null>[] = compact(
			data.entities.map((entity) => {
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

					default:
						throw new Error(`Invalid entity type: ${entity.type}`);
				}
			})
		);

		entities = compact(await Promise.all(entityPromises));
		layers = data.layers;
		if (data.layers.length === 0) {
			layers = [getNewLayer()];
		}
	}

	return {
		entities,
		layers,
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
