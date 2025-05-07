import {LOCAL_STORAGE_KEY} from '../../App.types.ts';
import {exportEntitiesAndLayersToJsonString} from './export-entities-to-json.ts';

export async function exportEntitiesToLocalStorage() {
	const json = await exportEntitiesAndLayersToJsonString();

	localStorage.setItem(LOCAL_STORAGE_KEY.DRAWING, json);
}
