import { Box, Point } from '@flatten-js/core';
import { Entity } from '../../entities/Entitity.ts';
import { Dispatch, SetStateAction } from 'react';
import { SelectionRectangleEntity } from '../../entities/SelectionRectangleEntity.ts';
import { findClosestEntity } from '../find-closest-entity.ts';
import { HIGHLIGHT_ENTITY_DISTANCE } from '../../App.consts.ts';
import { deHighlightEntities, deSelectEntities } from '../select-entities.ts';

export function handleSelectToolClick(
  worldClickPoint: Point,
  holdingCtrl: boolean,
  holdingShift: boolean,
  setEntities: Dispatch<SetStateAction<Entity[]>>,
  activeEntity: Entity | null,
  setActiveEntity: Dispatch<SetStateAction<Entity | null>>,
) {
  setEntities(oldEntities => {
    let newEntities: Entity[] = [...oldEntities];

    let activeSelectionRectangle = null;
    if (activeEntity instanceof SelectionRectangleEntity) {
      activeSelectionRectangle = activeEntity as SelectionRectangleEntity;
    }

    const closestEntityInfo = findClosestEntity(worldClickPoint, newEntities);

    // Mouse is close to entity and is not dragging a rectangle
    if (
      closestEntityInfo &&
      closestEntityInfo[0] < HIGHLIGHT_ENTITY_DISTANCE &&
      !activeSelectionRectangle
    ) {
      // Select the entity close to the mouse
      const closestEntity = closestEntityInfo[2];
      console.log('selecting entity close to the mouse: ', closestEntity);
      if (!holdingCtrl && !holdingShift) {
        newEntities = deSelectEntities(newEntities);
      }
      if (holdingCtrl) {
        closestEntity.isSelected = !closestEntity.isSelected;
      } else {
        closestEntity.isSelected = true;
      }
      return newEntities;
    }

    // No elements are close to the mouse and no selection dragging is in progress
    if (!activeSelectionRectangle) {
      console.log(
        'Start a new selection rectangle drag: ',
        activeSelectionRectangle,
      );
      // Start a new selection rectangle drag
      activeSelectionRectangle = new SelectionRectangleEntity();
      setActiveEntity(activeSelectionRectangle); // TODO make selection a separate concept from entities
    }

    const completed = activeSelectionRectangle.send(
      new Point(worldClickPoint.x, worldClickPoint.y),
    );

    newEntities = deHighlightEntities(newEntities);
    if (completed) {
      // Finish the selection
      console.log('Finish selection: ', activeSelectionRectangle);
      const intersectionSelection =
        activeSelectionRectangle.isIntersectionSelection();
      newEntities.forEach(entity => {
        if (intersectionSelection) {
          if (
            entity.intersectsWithBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            ) ||
            entity.isContainedInBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            )
          ) {
            if (holdingCtrl) {
              entity.isSelected = !entity.isSelected;
            } else {
              entity.isSelected = true;
            }
          } else {
            if (!holdingCtrl && !holdingShift) {
              entity.isSelected = false;
            }
          }
        } else {
          if (
            entity.isContainedInBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            )
          ) {
            if (holdingCtrl) {
              entity.isSelected = !entity.isSelected;
            } else {
              entity.isSelected = true;
            }
          } else {
            if (!holdingCtrl && !holdingShift) {
              entity.isSelected = false;
            }
          }
        }
      });

      console.log('Set active entity to null');
      setActiveEntity(null);
    }
    return newEntities;
  });
}
