import {getEntitiesFromJsonString} from "./import-entities-from-json.ts";
import {setEntities} from "../../state.ts";
import type {Entity} from "../../entities/Entity.ts";

export enum LOCAL_STORAGE_KEY {
	DRAWING = 'OPEN_WEB_CAD__DRAWING',
};

export async function importEntitiesFromLocalStorage(): Promise<void> {
	const entities = await getEntitiesFromLocalStorage();
	setEntities(entities);
}

export async function getEntitiesFromLocalStorage(): Promise<Entity[]> {
	const json = localStorage.getItem(LOCAL_STORAGE_KEY.DRAWING);
	if (!json) {
		return [];
	}
	return (await getEntitiesFromJsonString(json)) || [];
}
