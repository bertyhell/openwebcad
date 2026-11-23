import { toast } from 'react-toastify';
import { LOCAL_STORAGE_KEY } from '../../App.types.ts';
import { setActiveLayerId, setEntities, setLayers } from '../../state.ts';
import { zoomToBounds } from '../../tools/zoom-tool.helpers.ts';
import { getNewLayer } from '../get-new-layer.ts';
import { getEntitiesAndLayersFromJsonString } from './json.import.ts';
import type { JsonDrawingFileDeserialized } from './json.types.ts';

export async function importEntitiesAndLayersFromLocalStorage(): Promise<void> {
	const file = await getEntitiesAndLayersFromLocalStorage();
	setEntities(file.entities);
	setLayers(file.layers, true, true);
	setActiveLayerId(file.layers[0].id);
	zoomToBounds();
}

export async function getEntitiesAndLayersFromLocalStorage(): Promise<JsonDrawingFileDeserialized> {
	const emptyDrawing: JsonDrawingFileDeserialized = {
		entities: [],
		layers: [getNewLayer([])],
	};
	const json = localStorage.getItem(LOCAL_STORAGE_KEY.DRAWING);
	if (!json) {
		return emptyDrawing;
	}

	try {
		const file = await getEntitiesAndLayersFromJsonString(json);
		if (file.skippedEntityCount) {
			backUpSavedDrawing(json);
			toast.warning(
				`${file.skippedEntityCount} entities of the saved drawing could not be loaded. The original drawing is kept in local storage under ${LOCAL_STORAGE_KEY.DRAWING_BACKUP}`,
				{ autoClose: false }
			);
		}
		return file;
	} catch (error) {
		console.error('Failed to load the saved drawing', error);
		backUpSavedDrawing(json);
		toast.error(
			`The saved drawing could not be loaded. It is kept in local storage under ${LOCAL_STORAGE_KEY.DRAWING_BACKUP}`,
			{ autoClose: false }
		);
		return emptyDrawing;
	}
}

/**
 * Keep a copy of a saved drawing that couldn't be fully loaded, since autosave will overwrite it on the next change
 */
function backUpSavedDrawing(json: string): void {
	try {
		localStorage.setItem(LOCAL_STORAGE_KEY.DRAWING_BACKUP, json);
	} catch (error) {
		console.error('Failed to back up the saved drawing', error);
	}
}
