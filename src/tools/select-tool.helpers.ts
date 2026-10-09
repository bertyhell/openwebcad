import type {Box, Point, Polygon} from '@flatten-js/core';
import {uniq} from 'es-toolkit';
import {
	EPSILON,
	HIGHLIGHT_ENTITY_DISTANCE,
	SELECTION_RECTANGLE_COLOR_CONTAINS,
	SELECTION_RECTANGLE_COLOR_INTERSECTION,
	SELECTION_RECTANGLE_STYLE,
	SELECTION_RECTANGLE_WIDTH,
} from '../App.consts';
import {RectangleEntity} from '../entities/RectangleEntity';
import {findClosestEntity} from '../helpers/find-closest-entity';
import {getEditableEntities, getSelectedEntityIds, isEntitySelected, setGhostHelperEntities, setSelectedEntityIds,} from '../state';
import type {SelectContext} from './select-tool';
import type {MouseClickEvent} from './tool.types';

export function handleFirstSelectionPoint(
	context: SelectContext,
	event: MouseClickEvent
): SelectContext {
	const closestEntityInfo = findClosestEntity(event.worldMouseLocation, getEditableEntities());

	// Mouse is close to entity and is not dragging a rectangle
	if (closestEntityInfo && closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE) {
		// Select the entity close to the mouse
		const closestEntity = closestEntityInfo.entity;
		if (!event.holdingCtrl && !event.holdingShift) {
			setSelectedEntityIds([closestEntity.id]);
		} else if (event.holdingCtrl) {
			// ctrl => toggle selection
			if (isEntitySelected(closestEntity)) {
				// Remove the entity from the selection
				setSelectedEntityIds(getSelectedEntityIds().filter((id) => id !== closestEntity.id));
			} else {
				// Add the entity to the selection
				setSelectedEntityIds([...getSelectedEntityIds(), closestEntity.id]);
			}
		} else {
			// shift => add to selection
			setSelectedEntityIds(uniq([...getSelectedEntityIds(), closestEntity.id]));
		}
		return {
			...context,
			startPoint: null,
		};
	}

	// No elements are close to the mouse and no selection dragging is in progress
	// Start a new selection rectangle drag
	return {
		...context,
		startPoint: event.worldMouseLocation,
	};
}

/**
 * Combine the entities inside the selection rectangle with the current selection
 * - no modifier: replace the selection
 * - ctrl: toggle the selection of the entities inside the rectangle
 * - shift: add the entities inside the rectangle to the selection
 */
export function combineSelection(
	currentSelection: string[],
	rectangleSelection: string[],
	holdingCtrl: boolean,
	holdingShift: boolean
): string[] {
	if (holdingCtrl) {
		const toggledOff = new Set(rectangleSelection.filter((id) => currentSelection.includes(id)));
		return [
			...currentSelection.filter((id) => !toggledOff.has(id)),
			...rectangleSelection.filter((id) => !toggledOff.has(id)),
		];
	}
	if (holdingShift) {
		return uniq([...currentSelection, ...rectangleSelection]);
	}
	return rectangleSelection;
}

export function selectEntitiesInsideRectangle(
	startPoint: Point,
	endPoint: Point,
	holdingCtrl: boolean,
	holdingShift = false
): void {
	// Finish the selection
	const activeSelectionRectangle = new RectangleEntity(startPoint, endPoint);
	const intersectionSelection = getIsIntersectionSelection(activeSelectionRectangle, startPoint);
	const selectionBox = activeSelectionRectangle.getBoundingBox() as Box;
	const rectangleSelection = getEditableEntities()
		.filter((entity) => {
			if (intersectionSelection) {
				// Select all entities that are inside the selection rectangle or intersect with the selection rectangle
				return entity.intersectsWithBox(selectionBox) || entity.isContainedInBox(selectionBox);
			}
			// Select only entities that are completely inside the selection rectangle
			return entity.isContainedInBox(selectionBox);
		})
		.map((entity) => entity.id);
	setSelectedEntityIds(
		combineSelection(getSelectedEntityIds(), rectangleSelection, holdingCtrl, holdingShift)
	);
}

export function drawTempSelectionRectangle(startPoint: Point, endPoint: Point) {
	const activeSelectionRectangle = new RectangleEntity(startPoint, endPoint);
	const isIntersectionSelection: boolean = getIsIntersectionSelection(
		activeSelectionRectangle,
		startPoint
	);
	activeSelectionRectangle.lineColor = isIntersectionSelection
		? SELECTION_RECTANGLE_COLOR_INTERSECTION
		: SELECTION_RECTANGLE_COLOR_CONTAINS;
	activeSelectionRectangle.lineWidth = SELECTION_RECTANGLE_WIDTH;
	activeSelectionRectangle.lineDash = SELECTION_RECTANGLE_STYLE;
	setGhostHelperEntities([activeSelectionRectangle]);
}

/**
 * Selections to the left of the start point are intersection selections (green), and everything intersecting with the selection rectangle will be selected
 * Selections to the right of the start point are normal selections (blue), and only the entities fully inside the selection rectangle will be selected
 */
export function getIsIntersectionSelection(
	rectangleEntity: RectangleEntity,
	startPoint: Point
): boolean {
	if (!rectangleEntity.getShape() || !startPoint) {
		return false;
	}
	const selectionRectangleMinX = Math.min(
		...(rectangleEntity.getShape() as Polygon).vertices.map((v) => v.x)
	);
	return Math.abs(startPoint.x - selectionRectangleMinX) > EPSILON;
}
