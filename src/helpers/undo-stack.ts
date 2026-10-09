import type { Layer } from '../App.types';
import type { Entity } from '../entities/Entity';

/**
 * Snapshot of the drawing. Layers are stored together with the entities,
 * so undoing a layer deletion also brings back the layer of its entities
 */
export interface UndoState {
	entities: Entity[];
	layers: Layer[];
}

export enum StateVariable {
	canvasSize = 'canvasSize',
	canvas = 'canvas',
	context = 'context',
	screenMouseLocation = 'screenMouseLocation',
	activeTool = 'activeTool',
	entities = 'entities',
	activeEntity = 'activeEntity',
	shouldDrawCursor = 'shouldDrawCursor',
	helperEntities = 'helperEntities',
	debugEntities = 'debugEntities',
	angleStep = 'angleStep',
	screenOffset = 'screenOffset',
	screenZoom = 'screenZoom',
	panStartLocation = 'panStartLocation',
	snapPoint = 'snapPoint',
	snapPointOnAngleGuide = 'snapPointOnAngleGuide',
	hoveredSnapPoints = 'hoveredSnapPoints',
	lastDrawTimestamp = 'lastDrawTimestamp',
	activeLineColor = 'activeLineColor',
	activeFillColor = 'activeFillColor',
	activeLineWidth = 'activeLineWidth',
	layers = 'layers',
	selectedEntityIds = 'selectedEntityIds',
	instructions = 'instructions',
	gridSettings = 'gridSettings',
}

/**
 * Maximum number of undo steps that are kept in memory
 */
export const MAX_UNDO_STATES = 200;

/**
 * Based on https://github.com/wobsoriano/undo-stacker
 */
export function createStack(maxStates = MAX_UNDO_STATES) {
	const stack: UndoState[] = [];

	let index = stack.length;

	function peek(): UndoState | undefined {
		return stack[index - 1];
	}

	return {
		push: (value: UndoState) => {
			stack.length = index;
			stack[index++] = value;

			// Forget the oldest states, so memory usage stays bounded
			const overflow = stack.length - maxStates;
			if (overflow > 0) {
				stack.splice(0, overflow);
				index -= overflow;
			}
			return peek();
		},
		peek: () => {
			return peek();
		},
		undo: () => {
			if (index > 1) index -= 1;
			return peek();
		},
		redo: () => {
			if (index < stack.length) index += 1;
			return peek();
		},
		size: () => stack.length,
		clear: () => {
			stack.length = 0;
			index = 0;
		},
	};
}
