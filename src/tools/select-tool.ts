import { Box, Point } from '@flatten-js/core';
import { SelectionRectangleEntity } from '../entities/SelectionRectangleEntity.ts';
import { findClosestEntity } from '../helpers/find-closest-entity.ts';
import { HIGHLIGHT_ENTITY_DISTANCE } from '../App.consts.ts';
import {
  getActiveEntity,
  getEntities,
  getSelectedEntityIds,
  isEntitySelected,
  setActiveEntity,
  setActiveTool,
  setHighlightedEntityIds,
  setSelectedEntityIds,
  setShouldDrawHelpers,
} from '../state.ts';
import { compact } from 'es-toolkit';
import { ToolHandler } from './tool.types.ts';
import { Tool } from '../tools.ts';

export const selectToolHandler: ToolHandler = {
  handleToolActivate: () => {
    setActiveTool(Tool.Select);
    setShouldDrawHelpers(false);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  },

  handleToolClick: (
    worldClickPoint: Point,
    holdingCtrl: boolean,
    holdingShift: boolean,
  ) => {
    handleSelectToolClick(worldClickPoint, holdingCtrl, holdingShift);
  },

  handleToolTypedCommand: (command: string) => {
    console.log('select tool typed command:', command);
  },
};

function handleSelectToolClick(
  worldClickPoint: Point,
  holdingCtrl: boolean,
  holdingShift: boolean,
) {
  const activeEntity = getActiveEntity();

  let activeSelectionRectangle: SelectionRectangleEntity | null = null;
  if (activeEntity instanceof SelectionRectangleEntity) {
    activeSelectionRectangle = activeEntity as SelectionRectangleEntity;
  }

  const closestEntityInfo = findClosestEntity(worldClickPoint, getEntities());

  // Mouse is close to entity and is not dragging a rectangle
  if (
    closestEntityInfo &&
    closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE &&
    !activeSelectionRectangle
  ) {
    // Select the entity close to the mouse
    const closestEntity = closestEntityInfo.entity;
    console.log('selecting entity close to the mouse: ', closestEntity);
    if (!holdingCtrl && !holdingShift) {
      setSelectedEntityIds([closestEntity.id]);
    } else if (holdingCtrl) {
      // ctrl => toggle selection
      if (isEntitySelected(closestEntity)) {
        // Remove the entity from the selection
        setSelectedEntityIds(
          getSelectedEntityIds().filter(id => id !== closestEntity.id),
        );
      } else {
        // Add the entity to the selection
        setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
      }
    } else {
      // shift => add to selection
      setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
    }
    return;
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

  setHighlightedEntityIds([]);
  if (completed) {
    // Finish the selection
    console.log('Finish selection: ', activeSelectionRectangle);
    const intersectionSelection =
      activeSelectionRectangle.isIntersectionSelection();
    const newSelectedEntityIds: string[] = compact(
      getEntities().map((entity): string | null => {
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
              if (isEntitySelected(entity)) {
                return null;
              } else {
                return entity.id;
              }
            } else {
              return entity.id;
            }
          }
        } else {
          if (
            entity.isContainedInBox(
              activeSelectionRectangle.getBoundingBox() as Box,
            )
          ) {
            if (holdingCtrl) {
              if (isEntitySelected(entity)) {
                return null;
              } else {
                return entity.id;
              }
            } else {
              return entity.id;
            }
          }
        }
        return null;
      }),
    );
    setSelectedEntityIds(newSelectedEntityIds);

    console.log('Set active entity to null');
    setActiveEntity(null);
  }
}
