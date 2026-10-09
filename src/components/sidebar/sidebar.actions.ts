import { Actor } from 'xstate';
import type { Layer } from '../../App.types.ts';
import { getNewLayer } from '../../helpers/get-new-layer.ts';
import { imageImport } from '../../helpers/import-export-handlers/image.import.ts';
import {
	getActiveLayerId,
	getActiveToolActor,
	getEntities,
	getInputController,
	getLayers,
	getScreenCanvasDrawController,
	getSelectedEntities,
	setActiveLayerId,
	setActiveToolActor,
	setEntities,
	setGhostHelperEntities,
	setLayers,
	setSelectedEntityIds,
} from '../../state.ts';
import type { Tool } from '../../tools.ts';
import { imageImportToolStateMachine } from '../../tools/image-import-tool.ts';
import { TOOL_STATE_MACHINES } from '../../tools/tool.consts.ts';
import { ActorEvent } from '../../tools/tool.types.ts';

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
	getScreenCanvasDrawController().setScreenScale(zoomPercentage / 100);
}

export function zoomToFit(): void {
	getScreenCanvasDrawController().zoomToFitScreen();
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
		})
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

export function toggleLayerVisibility(layerId: string): void {
	const layer = getLayers().find((layer) => layer.id === layerId);
	updateLayer(layerId, { isVisible: !layer?.isVisible });
	ensureActiveLayerIsEditable();
}

export function toggleLayerLock(layerId: string): void {
	const layer = getLayers().find((layer) => layer.id === layerId);
	updateLayer(layerId, { isLocked: !layer?.isLocked });
	ensureActiveLayerIsEditable();
}

export function createLayer(): void {
	const newLayer: Layer = getNewLayer();
	setLayers([...getLayers(), newLayer]);
	setActiveLayerId(newLayer.id);
}

export function deleteLayer(layerId: string): void {
	const remainingLayers = getLayers().filter((layer) => layer.id !== layerId);
	if (!remainingLayers.length) {
		return; // Always keep at least one layer
	}
	setEntities(
		getEntities().filter((entity) => entity.layerId !== layerId),
		true
	);
	setLayers(remainingLayers);
	if (getActiveLayerId() === layerId) {
		setActiveLayerId(remainingLayers[0].id);
	}
}

export function selectEntitiesOnLayer(layerId: string): number {
	const entitiesOnLayer = getEntities().filter((entity) => entity.layerId === layerId);
	setSelectedEntityIds(entitiesOnLayer.map((entity) => entity.id));
	return entitiesOnLayer.length;
}

export function moveSelectionToLayer(layerId: string): number {
	const selectedEntities = getSelectedEntities();
	for (const entity of selectedEntities) {
		entity.layerId = layerId;
	}
	return selectedEntities.length;
}
