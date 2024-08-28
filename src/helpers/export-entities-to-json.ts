import { getEntities } from '../state.ts';
import { saveAs } from 'file-saver';
import { JsonEntity } from '../entities/Entity.ts';
import { compact } from 'es-toolkit';

export function exportEntitiesToJsonFile() {
  const entities = getEntities();

  const jsonEntities = compact(entities.map(entity => entity.toJson()));
  const jsonDrawingFile: JsonDrawingFile = {
    entities: jsonEntities,
  };
  const json = JSON.stringify(jsonDrawingFile, null, 2);

  const blob = new Blob([json], { type: 'text/json;charset=utf-8' });
  saveAs(blob, 'open-web-cad--drawing.json');
}

export interface JsonDrawingFile {
  entities: JsonEntity[];
}
