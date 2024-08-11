import { Entity } from '../entities/Entitity.ts';

export function deHighlightEntities(entitiesTemp: Entity[]): Entity[] {
  return entitiesTemp.map(entity => {
    entity.isHighlighted = false;
    return entity;
  });
}

export function deSelectEntities(entitiesTemp: Entity[]): Entity[] {
  return entitiesTemp.map(entity => {
    entity.isSelected = false;
    return entity;
  });
}

export function deSelectAndDeHighlightEntities(
  entitiesTemp: Entity[],
): Entity[] {
  return entitiesTemp.map(entity => {
    entity.isHighlighted = false;
    entity.isSelected = false;
    return entity;
  });
}
