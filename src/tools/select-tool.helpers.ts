import {
  getEntities,
  getSelectedEntityIds,
  isEntitySelected,
  setActiveEntity,
  setSelectedEntityIds,
} from '../state.ts';
import {
  EPSILON,
  HIGHLIGHT_ENTITY_DISTANCE,
  SELECTION_RECTANGLE_COLOR_CONTAINS,
  SELECTION_RECTANGLE_COLOR_INTERSECTION,
  SELECTION_RECTANGLE_STYLE,
  SELECTION_RECTANGLE_WIDTH,
} from '../App.consts.ts';
import { SelectContext } from './select-tool.ts';
import { MouseClickEvent } from './tool.types.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { compact } from 'es-toolkit';
import { Box, Point } from '@flatten-js/core';
import { findClosestEntity } from '../helpers/find-closest-entity.ts';

export function handleFirstSelectionPoint(
  _: SelectContext,
  event: MouseClickEvent,
): SelectContext {
  const closestEntityInfo = findClosestEntity(
    event.worldClickPoint,
    getEntities(),
  );

  // Mouse is close to entity and is not dragging a rectangle
  if (
    closestEntityInfo &&
    closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE
  ) {
    // Select the entity close to the mouse
    const closestEntity = closestEntityInfo.entity;
    console.log('selecting entity close to the mouse: ', closestEntity);
    if (!event.holdingCtrl && !event.holdingShift) {
      setSelectedEntityIds([closestEntity.id]);
    } else if (event.holdingCtrl) {
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
    return {
      startPoint: null,
    };
  }

  // No elements are close to the mouse and no selection dragging is in progress
  console.log('Start a new selection rectangle drag');
  // Start a new selection rectangle drag
  return {
    startPoint: event.worldClickPoint,
  };
}

export function handleSecondSelectionPoint(
  context: SelectContext,
  event: MouseClickEvent,
): SelectContext {
  if (!context.startPoint) {
    // Assert startPoint
    throw new Error(
      '[SELECT] Got into second selection point state without start point being set',
    );
  }
  // Finish the selection
  const activeSelectionRectangle = new RectangleEntity(
    context.startPoint,
    event.worldClickPoint,
  );
  console.log('Finish selection: ', activeSelectionRectangle);
  const intersectionSelection = getIsIntersectionSelection(
    activeSelectionRectangle,
    context.startPoint,
  );
  const newSelectedEntityIds: string[] = compact(
    getEntities().map((entity): string | null => {
      if (intersectionSelection) {
        // Select all entities that are inside the selection rectangle or intersect with the selection rectangle
        if (
          entity.intersectsWithBox(
            activeSelectionRectangle.getBoundingBox() as Box,
          ) ||
          entity.isContainedInBox(
            activeSelectionRectangle.getBoundingBox() as Box,
          )
        ) {
          if (event.holdingCtrl) {
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
        // Select only entities that are completely inside the selection rectangle
        if (
          entity.isContainedInBox(
            activeSelectionRectangle.getBoundingBox() as Box,
          )
        ) {
          if (event.holdingCtrl) {
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
  return {
    startPoint: null,
  };
}

export function drawTempSelectionRectangle(startPoint: Point, endPoint: Point) {
  console.log('draw Temp Selection rectangle', { startPoint, endPoint });
  const activeSelectionRectangle = new RectangleEntity(startPoint, endPoint);
  const isIntersectionSelection: boolean = getIsIntersectionSelection(
    activeSelectionRectangle,
    startPoint,
  );
  activeSelectionRectangle.lineColor = isIntersectionSelection
    ? SELECTION_RECTANGLE_COLOR_INTERSECTION
    : SELECTION_RECTANGLE_COLOR_CONTAINS;
  activeSelectionRectangle.lineWidth = SELECTION_RECTANGLE_WIDTH;
  activeSelectionRectangle.lineStyle = SELECTION_RECTANGLE_STYLE;
  setActiveEntity(activeSelectionRectangle);
}

/**
 * Selections to the left of the start point are intersection selections (green), and everything intersecting with the selection rectangle will be selected
 * SElections to the right of the start point are normal selections (blue), and only the entities fully inside the selection rectangle will be selected
 */
export function getIsIntersectionSelection(
  rectangleEntity: RectangleEntity,
  startPoint: Point,
): boolean {
  if (!rectangleEntity.getShape() || !startPoint) {
    return false;
  }
  return (
    Math.abs(startPoint.x - (rectangleEntity.getShape() as Box).xmin) > EPSILON
  );
}
