import {compact} from 'es-toolkit';
import {saveAs} from 'file-saver';
import type {Layer} from '../../App.types.ts';
import type {Entity, JsonEntity} from '../../entities/Entity';
import {getEntities, getLayers} from '../../state';

export async function exportEntitiesToJsonFile() {
	const json = await exportEntitiesAndLayersToJsonString();

	const blob = new Blob([json], { type: 'text/json;charset=utf-8' });
	saveAs(blob, 'open-web-cad--drawing.json');
}

export async function exportEntitiesAndLayersToJsonString() {
	const entities = getEntities();

	const jsonEntities = entities.map((entity) => entity.toJson());
	const jsonDrawingFile: JsonDrawingFileSerialized = {
		entities: compact(await Promise.all(jsonEntities)), // TODO use a mapLimit to avoid overloading the event loop
		layers: getLayers(),
	};
	return JSON.stringify(jsonDrawingFile, null, 2);
}

export interface JsonDrawingFileSerialized {
	entities: JsonEntity[];
	layers: Layer[];
}

export interface JsonDrawingFileDeserialized {
	entities: Entity[];
	layers: Layer[];
}
