import { Actor } from 'xstate';
import type { Layer } from '../../App.types.ts';
import type { Entity } from '../../entities/Entity.ts';
import { getNewLayer } from '../../helpers/get-new-layer.ts';
import { imageImport } from '../../helpers/import-export-handlers/image.import.ts';
import {
	getActiveLayerId,
	getActiveToolActor,
	getEditableEntities,
	getEntities,
	getInputController,
	getLayers,
	getSelectedEntities,
	setActiveLayerId,
	setActiveToolActor,
	setEntities,
	setGhostHelperEntities,
	setLayers,
	setSelectedEntityIds,
} from '../../state.ts';
import { imageImportToolStateMachine } from '../../tools/image-import-tool.ts';
import { TOOL_STATE_MACHINES } from '../../tools/tool.consts.ts';
import { ActorEvent } from '../../tools/tool.types.ts';
import { zoomToBounds, zoomToScale } from '../../tools/zoom-tool.helpers.ts';
import type { Tool } from '../../tools.ts';

export function activateTool(tool: Tool): void {
	getActiveToolActor()?.stop();
	setActiveToolActor(new Actor(TOOL_STATE_MACHINES[tool]));
}

export async function startImageImport(file: File | undefined): Promise<void> {
	const image: HTMLImageElement = await imageImport(file);
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

/**
 * Hidden or locked layers can't receive new entities, so move the active layer to another layer
 */
function ensureActiveLayerIsEditable(): void {
	const activeLayer = getLayers().find((layer) => layer.id === getActiveLayerId());
	if (activeLayer?.isVisible && !activeLayer.isLocked) {
		return;
	}
	const editableLayer = getLayers().find((layer) => layer.isVisible && !layer.isLocked);
	if (editableLayer) {
		setActiveLayerId(editableLayer.id);
	}
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

export function setLayerColor(layerId: string, color: string): void {
	updateLayer(layerId, { color });
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
		setActiveLayerId(remainingLayers[0].id);
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
