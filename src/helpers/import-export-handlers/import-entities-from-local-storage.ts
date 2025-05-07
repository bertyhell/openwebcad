import {LOCAL_STORAGE_KEY} from '../../App.types.ts';
import {setEntities, setLayers} from '../../state.ts';
import {getNewLayer} from '../get-new-layer.ts';
import {getEntitiesAndLayersFromJsonString} from './import-entities-from-json.ts';
import type {JsonDrawingFileDeserialized} from "./export-entities-to-json.ts";

export async function importEntitiesAndLayersFromLocalStorage(): Promise<void> {
	const file = await getEntitiesAndLayersFromLocalStorage();
	setEntities(file.entities);
	setLayers(file.layers);
}

export async function getEntitiesAndLayersFromLocalStorage(): Promise<JsonDrawingFileDeserialized> {
	const json = localStorage.getItem(LOCAL_STORAGE_KEY.DRAWING);
	if (!json) {
		return {
			entities: [],
			layers: [getNewLayer()],
		};
	}

	const file = (await getEntitiesAndLayersFromJsonString(json)) || [];
	return file;
}
