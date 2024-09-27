import { JsonDrawingFile } from './export-entities-to-json.ts';
import { compact } from 'es-toolkit';
import { Entity, EntityName, JsonEntity } from '../../entities/Entity.ts';
import { ArcEntity, ArcJsonData } from '../../entities/ArcEntity.ts';
import { CircleEntity, CircleJsonData } from '../../entities/CircleEntity.ts';
import { LineEntity, LineJsonData } from '../../entities/LineEntity.ts';
import { PointEntity, PointJsonData } from '../../entities/PointEntity.ts';
import {
  RectangleEntity,
  RectangleJsonData,
} from '../../entities/RectangleEntity.ts';
import { setEntities } from '../../state.ts';

/**
 * Open a file selection dialog to select *.json files
 * Parse the JSON file
 * Generate entities from the JSON data
 * Set the entities in the state
 */
export function importEntitiesFromJsonFile(file: File | null | undefined) {
  return new Promise<void>((resolve, reject) => {
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', async () => {
      const json = reader.result as string;
      const data = JSON.parse(json) as JsonDrawingFile;

      if (!data.entities) {
        reject(new Error('Invalid JSON file'));
      }

      // TODO use map limit to avoid overloading the event loop
      const entityPromises: Promise<Entity | null>[] = compact(
        data.entities.map(entity => {
          switch (entity.type) {
            case EntityName.Arc:
              return new ArcEntity().fromJson(
                entity as JsonEntity<ArcJsonData>,
              );
            case EntityName.Circle:
              return new CircleEntity().fromJson(
                entity as JsonEntity<CircleJsonData>,
              );
            case EntityName.Line:
              return new LineEntity().fromJson(
                entity as JsonEntity<LineJsonData>,
              );
            case EntityName.Point:
              return new PointEntity().fromJson(
                entity as JsonEntity<PointJsonData>,
              );
            case EntityName.Rectangle:
              return new RectangleEntity().fromJson(
                entity as JsonEntity<RectangleJsonData>,
              );

            default:
              reject(new Error('Invalid entity type: ' + entity.type));
          }
        }),
      );

      setEntities(compact(await Promise.all(entityPromises)));
      resolve();
    });
    reader.readAsText(file, 'utf-8');
  });
}
