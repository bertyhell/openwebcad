import {saveAs} from 'file-saver';
import {compact} from 'es-toolkit';
import {getEntities} from '../../state';
import type {JsonEntity} from '../../entities/Entity';

export async function exportEntitiesToJsonFile() {
  const json = await exportEntitiesToJsonString();

  const blob = new Blob([json], { type: 'text/json;charset=utf-8' });
  saveAs(blob, 'open-web-cad--drawing.json');
}

export async function exportEntitiesToJsonString() {
    const entities = getEntities();

    const jsonEntities = entities.map(entity => entity.toJson());
    const jsonDrawingFile: JsonDrawingFile = {
        entities: compact(await Promise.all(jsonEntities)), // TODO use a mapLimit to avoid overloading the event loop
    };
  return JSON.stringify(jsonDrawingFile, null, 2);
}

export interface JsonDrawingFile {
  entities: JsonEntity[];
}
