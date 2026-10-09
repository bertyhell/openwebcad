import type { Layer } from '../App.types.ts';
import { getLayers } from '../state.ts';

/**
 * Creates a layer with a name that isn't used yet by the existing layers. eg: Layer 3
 */
export function getNewLayer(existingLayers: Layer[] = getLayers()): Layer {
	const existingNames = new Set(existingLayers.map((layer) => layer.name));
	let layerNumber = existingLayers.length + 1;
	while (existingNames.has(`Layer ${layerNumber}`)) {
		layerNumber++;
	}
	return {
		id: crypto.randomUUID(),
		isLocked: false,
		isVisible: true,
		name: `Layer ${layerNumber}`,
	};
}
