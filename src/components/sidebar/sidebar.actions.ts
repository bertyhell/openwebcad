import { toast } from 'react-toastify';
import { Actor } from 'xstate';
import type { Layer } from '../../App.types.ts';
import { type Entity, EntityName } from '../../entities/Entity.ts';
import type { FillEntity } from '../../entities/FillEntity.ts';
import { type EntityGeometry, withEntityGeometry } from '../../helpers/entity-geometry.ts';
import { getNewLayer } from '../../helpers/get-new-layer.ts';
import { imageImport } from '../../helpers/import-export-handlers/image.import.ts';
import {
	getActiveLayerId,
	getEditableEntities,
	getEditableSelectedEntities,
	getEntities,
	getInputController,
	getLayers,
	getSelectedEntities,
	setActiveLayerId,
	setActiveLineColor,
	setActiveToolActor,
	setEntities,
	setGhostHelperEntities,
	setLayers,
	setSelectedEntityIds,
} from '../../state.ts';
import { imageImportToolStateMachine } from '../../tools/image-import-tool.ts';
import { ActorEvent } from '../../tools/tool.types.ts';
import { zoomToBounds, zoomToScale } from '../../tools/zoom-tool.helpers.ts';
import type { Tool } from '../../tools.ts';

export function activateTool(tool: Tool): void {
	// ENTER at the idle prompt repeats the last tool, also when it was started from the sidebar
	getInputController().startTool(tool);
}

export async function startImageImport(file: File | undefined): Promise<void> {
	if (!file) {
		return; // The file dialog was closed without choosing a file
	}
	let image: HTMLImageElement;
	try {
		image = await imageImport(file);
	} catch (error) {
		console.error('Failed to import the image', error);
		toast.error(`The image could not be loaded: ${file.name}`);
		return;
	}
	const imageImportActor = new Actor(imageImportToolStateMachine);
	imageImportActor.start();
	imageImportActor.send({
		type: ActorEvent.FILE_SELECTED,
		image,
	});
	setActiveToolActor(imageImportActor);
}

export function undoAction(): void {
	getInputController().handleUndo();
}

export function redoAction(): void {
	getInputController().handleRedo();
}

export function newDrawing(): void {
	setEntities([], true);
	setGhostHelperEntities([]);
	setSelectedEntityIds([]);
}

export function setZoomLevel(zoomPercentage: number): void {
	zoomToScale(zoomPercentage / 100);
}

export function zoomToFit(): void {
	zoomToBounds();
}

function updateLayer(layerId: string, update: Partial<Layer>): Layer | undefined {
	let updatedLayer: Layer | undefined;
	setLayers(
		getLayers().map((layer) => {
			if (layer.id !== layerId) {
				return layer;
			}
			updatedLayer = { ...layer, ...update };
			return updatedLayer;
		}),
		true,
		true
	);
	return updatedLayer;
}

function isLayerEditable(layer: Layer | undefined): boolean {
	return !!layer && layer.isVisible && !layer.isLocked;
}

/**
 * The layer that should become active when the active layer can't be used, eg: when the drawing is loaded
 * A hidden or locked layer would make new entities invisible or impossible to change
 */
export function getFirstEditableLayer(layers: Layer[]): Layer | undefined {
	return layers.find(isLayerEditable) ?? layers[0];
}

/**
 * Tell the user when new entities end up on a hidden or locked layer, because there is no other layer to put them on
 */
function warnWhenActiveLayerIsNotEditable(): void {
	const activeLayer = getLayers().find((layer) => layer.id === getActiveLayerId());
	if (!activeLayer || isLayerEditable(activeLayer)) {
		return;
	}
	if (!activeLayer.isVisible) {
		toast.warn(`Layer ${activeLayer.name} is hidden, show it to see what you draw`);
	} else {
		toast.warn(`Layer ${activeLayer.name} is locked, unlock it to change what you draw`);
	}
}

/**
 * Hidden or locked layers can't receive new entities, so move the active layer to another layer
 */
function ensureActiveLayerIsEditable(): void {
	const activeLayer = getLayers().find((layer) => layer.id === getActiveLayerId());
	if (isLayerEditable(activeLayer)) {
		return;
	}
	const editableLayer = getLayers().find(isLayerEditable);
	if (editableLayer) {
		setActiveLayerId(editableLayer.id);
	} else {
		warnWhenActiveLayerIsNotEditable();
	}
}

/**
 * Make the layer the one that new entities are added to
 * A hidden or locked layer can't be made active, new entities on it would be invisible or impossible to change
 * @returns whether the layer is active now
 */
export function activateLayer(layerId: string): boolean {
	const layer = getLayers().find((layer) => layer.id === layerId);
	if (!layer) {
		return false;
	}
	// Double clicking the layer name to rename it also clicks it twice, show the message only once
	const toastOptions = { toastId: `activate-layer-${layerId}` };
	if (!layer.isVisible) {
		toast.info(`Show layer ${layer.name} to draw on it`, toastOptions);
		return false;
	}
	if (layer.isLocked) {
		toast.info(`Unlock layer ${layer.name} to draw on it`, toastOptions);
		return false;
	}
	setActiveLayerId(layerId);
	return true;
}

/**
 * Entities on hidden or locked layers can't be modified, so remove them from the selection
 */
function deselectEntitiesOnLayer(layerId: string): void {
	const layer = getLayers().find((layer) => layer.id === layerId);
	if (layer?.isVisible && !layer.isLocked) {
		return;
	}
	setSelectedEntityIds(
		getSelectedEntities()
			.filter((entity) => entity.layerId !== layerId)
			.map((entity) => entity.id)
	);
}

export function toggleLayerVisibility(layerId: string): void {
	const layer = getLayers().find((layer) => layer.id === layerId);
	updateLayer(layerId, { isVisible: !layer?.isVisible });
	deselectEntitiesOnLayer(layerId);
	ensureActiveLayerIsEditable();
}

export function toggleLayerLock(layerId: string): void {
	const layer = getLayers().find((layer) => layer.id === layerId);
	updateLayer(layerId, { isLocked: !layer?.isLocked });
	deselectEntitiesOnLayer(layerId);
	ensureActiveLayerIsEditable();
}

export function renameLayer(layerId: string, name: string): void {
	const trimmedName = name.trim();
	const layer = getLayers().find((layer) => layer.id === layerId);
	if (!trimmedName || layer?.name === trimmedName) {
		return;
	}
	updateLayer(layerId, { name: trimmedName });
}

/**
 * New entities on the layer get this color, it becomes the active color right away when the layer is active
 */
export function setLayerColor(layerId: string, color: string): void {
	updateLayer(layerId, { color });
	if (getActiveLayerId() === layerId) {
		setActiveLineColor(color);
	}
}

export function createLayer(): void {
	const newLayer: Layer = getNewLayer();
	setLayers([...getLayers(), newLayer], true, true);
	setActiveLayerId(newLayer.id);
}

export function deleteLayer(layerId: string): void {
	const remainingLayers = getLayers().filter((layer) => layer.id !== layerId);
	if (!remainingLayers.length) {
		return; // Always keep at least one layer
	}
	setSelectedEntityIds(
		getSelectedEntities()
			.filter((entity) => entity.layerId !== layerId)
			.map((entity) => entity.id)
	);
	// Remove the layer and its entities in a single undo step, so undo brings both back together
	setEntities(getEntities().filter((entity) => entity.layerId !== layerId));
	setLayers(remainingLayers, true, true);
	if (getActiveLayerId() === layerId) {
		setActiveLayerId((getFirstEditableLayer(remainingLayers) ?? remainingLayers[0]).id);
		warnWhenActiveLayerIsNotEditable();
	}
}

export function selectEntitiesOnLayer(layerId: string): number {
	const entitiesOnLayer = getEditableEntities().filter((entity) => entity.layerId === layerId);
	setSelectedEntityIds(entitiesOnLayer.map((entity) => entity.id));
	return entitiesOnLayer.length;
}

/**
 * Replace the selected entities with clones on the new layer, so the change can be undone
 */
export function moveSelectionToLayer(layerId: string): number {
	const selectedEntities = getSelectedEntities();
	if (!selectedEntities.length) {
		return 0;
	}
	const movedEntityById = new Map<string, Entity>(
		selectedEntities.map((entity) => {
			const movedEntity = entity.clone();
			movedEntity.id = entity.id;
			movedEntity.layerId = layerId;
			return [entity.id, movedEntity];
		})
	);
	setEntities(
		getEntities().map((entity) => movedEntityById.get(entity.id) ?? entity),
		true
	);
	deselectEntitiesOnLayer(layerId);
	return selectedEntities.length;
}

/**
 * Replaces the editable selected entities with an updated copy, as one undo step
 * The copies keep the ids, so the selection stays the same
 */
export function updateSelectedEntities(update: (entity: Entity) => Entity | null): void {
	const selectedEntities = getEditableSelectedEntities();
	const updatedEntityById = new Map<string, Entity>();
	for (const entity of selectedEntities) {
		const updatedEntity = update(entity);
		if (updatedEntity) {
			updatedEntity.id = entity.id;
			updatedEntityById.set(entity.id, updatedEntity);
		}
	}
	if (!updatedEntityById.size) {
		return;
	}
	setEntities(
		getEntities().map((entity) => updatedEntityById.get(entity.id) ?? entity),
		true
	);
}

export function setSelectionLineColor(color: string): void {
	updateSelectedEntities((entity) => {
		const updatedEntity = entity.clone();
		updatedEntity.lineColor = color;
		return updatedEntity;
	});
}

export function setSelectionLineWidth(lineWidth: number): void {
	updateSelectedEntities((entity) => {
		const updatedEntity = entity.clone();
		updatedEntity.lineWidth = lineWidth;
		return updatedEntity;
	});
}

export function setSelectionGeometry(geometry: EntityGeometry): void {
	updateSelectedEntities((entity) => withEntityGeometry(entity, geometry));
}

export function setSelectionFillColor(fillColor: string): void {
	updateSelectedEntities((entity) => {
		if (entity.getType() !== EntityName.Fill) {
			return null;
		}
		const updatedEntity = entity.clone() as FillEntity;
		updatedEntity.fillColor = fillColor;
		return updatedEntity;
	});
}
