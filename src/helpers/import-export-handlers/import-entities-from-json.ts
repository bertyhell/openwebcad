import {compact} from 'es-toolkit';
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
import type {JsonDrawingFileDeserialized, JsonDrawingFileSerialized,} from './export-entities-to-json';

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

	const entities = compact(await Promise.all(entityPromises));
	let layers = data.layers;
	if (data.layers.length === 0) {
		layers = [getNewLayer()];
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

	if (!data.entities) {
		throw new Error('Invalid JSON file');
	}

	// TODO use map limit to avoid overloading the event loop
	return await getEntitiesAndLayersFromJsonObject(data);
}
