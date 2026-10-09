import {LOCAL_STORAGE_KEY} from '../../App.types.ts';
import {exportEntitiesAndLayersToJsonString} from './json.export.ts';

export async function localStorageExport() {
	const json = await exportEntitiesAndLayersToJsonString();

	localStorage.setItem(LOCAL_STORAGE_KEY.DRAWING, json);
}
