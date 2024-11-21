import { saveAs } from 'file-saver';
import { compact } from 'es-toolkit';
import { getEntities } from '../../state';
import { JsonEntity } from '../../entities/Entity';

export async function exportEntitiesToJsonFile() {
  const entities = getEntities();

  const jsonEntities = entities.map(entity => entity.toJson());
  const jsonDrawingFile: JsonDrawingFile = {
    entities: compact(await Promise.all(jsonEntities)), // TODO use a mapLimit to avoid overloading the event loop
  };
  const json = JSON.stringify(jsonDrawingFile, null, 2);

  const blob = new Blob([json], { type: 'text/json;charset=utf-8' });
  saveAs(blob, 'open-web-cad--drawing.json');
}

export interface JsonDrawingFile {
  entities: JsonEntity[];
}
