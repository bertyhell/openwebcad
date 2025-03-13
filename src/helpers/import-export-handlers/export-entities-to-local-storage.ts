import {exportEntitiesToJsonString} from "./export-entities-to-json.ts";

export enum LOCAL_STORAGE_KEY {
    DRAWING = 'OPEN_WEB_CAD__DRAWING',
    DROPDOWN = 'OPEN_WEB_CAD__DROPDOWN',
};

export async function exportEntitiesToLocalStorage() {
  const json = await exportEntitiesToJsonString();

  localStorage.setItem(LOCAL_STORAGE_KEY.DRAWING, json);
}
