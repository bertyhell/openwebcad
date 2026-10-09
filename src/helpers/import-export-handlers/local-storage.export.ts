import { toast } from 'react-toastify';
import { LOCAL_STORAGE_KEY } from '../../App.types.ts';
import { exportEntitiesAndLayersToJsonString } from './json.export.ts';

/**
 * Save the drawing to local storage
 * @returns true when the drawing was saved, false when the browser refused to store it, eg: storage quota exceeded
 */
export async function localStorageExport(): Promise<boolean> {
	const json = await exportEntitiesAndLayersToJsonString();

	try {
		localStorage.setItem(LOCAL_STORAGE_KEY.DRAWING, json);
		return true;
	} catch (err) {
		console.error('Failed to save the drawing to local storage', err);
		toast.error('Could not save the drawing in the browser. Export it to a file instead.', {
			toastId: 'local-storage-save-error',
		});
		return false;
	}
}
