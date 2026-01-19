import { LOCAL_STORAGE_KEY } from '../../App.types.ts';
import { setActiveLayerId, setEntities, setLayers } from '../../state.ts';
import { zoomToBounds } from '../../tools/zoom-tool.helpers.ts';
import { getNewLayer } from '../get-new-layer.ts';
import { getEntitiesAndLayersFromJsonString } from './json.import.ts';
import type { JsonDrawingFileDeserialized } from './json.types.ts';

export async function importEntitiesAndLayersFromLocalStorage(): Promise<void> {
	const file = await getEntitiesAndLayersFromLocalStorage();
	setEntities(file.entities);
	setLayers(file.layers);
	setActiveLayerId(file.layers[0].id);
	if (file.entities.length > 0) {
		zoomToBounds();
	}
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
