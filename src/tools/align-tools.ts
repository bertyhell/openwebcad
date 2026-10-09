import type { Box } from '@flatten-js/core';
import { createMachine, sendTo } from 'xstate';
import type { BoundingBox } from '../App.types.ts';
import type { Entity } from '../entities/Entity.ts';
import { getBoundingBoxOfMultipleEntities } from '../helpers/get-bounding-box-of-multiple-entities.ts';
import {
	getEditableSelectedEntities,
	getEntities,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state.ts';
import { Tool } from '../tools.ts';
import { selectToolStateMachine } from './select-tool.ts';
import type { StateEvent, ToolContext } from './tool.types.ts';
import { replaceEntities } from './transform-tool.helpers.ts';

export type AlignContext = ToolContext;

export enum AlignState {
	INIT = 'INIT',
	CHECK_SELECTION = 'CHECK_SELECTION',
	WAITING_FOR_SELECTION = 'WAITING_FOR_SELECTION',
}

export enum AlignAction {
	INIT_ALIGN_TOOL = 'INIT_ALIGN_TOOL',
	ALIGN_SELECTION = 'ALIGN_SELECTION',
	DESELECT_ENTITIES = 'DESELECT_ENTITIES',
}

/**
 * Offset to move an entity, so it lines up with the bounding box of the whole selection
 */
type AlignOffset = (entityBox: Box, selectionBox: BoundingBox) => [number, number];

const ALIGN_OFFSETS: Record<
	| Tool.ALIGN_LEFT
	| Tool.ALIGN_RIGHT
	| Tool.ALIGN_TOP
	| Tool.ALIGN_BOTTOM
	| Tool.ALIGN_CENTER_HORIZONTAL
	| Tool.ALIGN_CENTER_VERTICAL,
	AlignOffset
> = {
	[Tool.ALIGN_LEFT]: (entityBox, selectionBox) => [selectionBox.minX - entityBox.xmin, 0],
	[Tool.ALIGN_RIGHT]: (entityBox, selectionBox) => [selectionBox.maxX - entityBox.xmax, 0],
	[Tool.ALIGN_TOP]: (entityBox, selectionBox) => [0, selectionBox.maxY - entityBox.ymax],
	[Tool.ALIGN_BOTTOM]: (entityBox, selectionBox) => [0, selectionBox.minY - entityBox.ymin],
	[Tool.ALIGN_CENTER_HORIZONTAL]: (entityBox, selectionBox) => [
		(selectionBox.minX + selectionBox.maxX) / 2 - (entityBox.xmin + entityBox.xmax) / 2,
		0,
	],
	[Tool.ALIGN_CENTER_VERTICAL]: (entityBox, selectionBox) => [
		0,
		(selectionBox.minY + selectionBox.maxY) / 2 - (entityBox.ymin + entityBox.ymax) / 2,
	],
};

/**
 * Aligns clones of the entities, so the change can be undone
 */
export function getAlignedEntities(entities: Entity[], getOffset: AlignOffset): Entity[] {
	const selectionBox = getBoundingBoxOfMultipleEntities(entities);
	return entities.map((entity) => {
		const alignedEntity = entity.clone();
		const [offsetX, offsetY] = getOffset(entity.getBoundingBox(), selectionBox);
		alignedEntity.move(offsetX, offsetY);
		return alignedEntity;
	});
}

/**
 * Align tool state machine
 * It uses the select tool state machine to select entities to align
 * When the user presses enter, the selected entities are aligned
 * The selection is kept, so the user can align it again in another way
 */
function createAlignToolStateMachine(tool: keyof typeof ALIGN_OFFSETS) {
	return createMachine(
		{
			types: {} as {
				context: AlignContext;
				events: StateEvent;
			},
			context: {
				type: tool,
			},
			initial: AlignState.INIT,
			states: {
				[AlignState.INIT]: {
					description: 'Initializing the align tool',
					always: {
						actions: AlignAction.INIT_ALIGN_TOOL,
						target: AlignState.CHECK_SELECTION,
					},
				},
				[AlignState.CHECK_SELECTION]: {
					description: 'Check if there is something selected',
					always: [
						{
							guard: () => getEditableSelectedEntities().length > 0,
							actions: AlignAction.ALIGN_SELECTION,
							target: AlignState.WAITING_FOR_SELECTION,
						},
						{
							target: AlignState.WAITING_FOR_SELECTION,
						},
					],
				},
				[AlignState.WAITING_FOR_SELECTION]: {
					description: 'Select what you want to align',
					meta: {
						instructions: 'Select what you want to align, then ENTER',
					},
					invoke: {
						id: 'selectToolInsideTheAlignTool',
						src: selectToolStateMachine,
						onDone: {
							target: AlignState.CHECK_SELECTION,
						},
					},
					on: {
						// Forward the events to the select tool
						MOUSE_CLICK: { actions: sendTo('selectToolInsideTheAlignTool', ({ event }) => event) },
						ENTER: { actions: sendTo('selectToolInsideTheAlignTool', ({ event }) => event) },
						DRAW: { actions: sendTo('selectToolInsideTheAlignTool', ({ event }) => event) },
						ESC: {
							actions: [AlignAction.DESELECT_ENTITIES, AlignAction.INIT_ALIGN_TOOL],
						},
					},
				},
			},
		},
		{
			actions: {
				[AlignAction.INIT_ALIGN_TOOL]: () => {
					setShouldDrawHelpers(false);
					setGhostHelperEntities([]);
					setAngleGuideOriginPoint(null);
				},
				[AlignAction.ALIGN_SELECTION]: () => {
					const selectedEntities = getEditableSelectedEntities();
					const alignedEntities = getAlignedEntities(selectedEntities, ALIGN_OFFSETS[tool]);
					setEntities(replaceEntities(getEntities(), selectedEntities, alignedEntities), true);
				},
				[AlignAction.DESELECT_ENTITIES]: () => {
					setGhostHelperEntities([]);
					setSelectedEntityIds([]);
				},
			},
		}
	);
}

export const alignLeftToolStateMachine = createAlignToolStateMachine(Tool.ALIGN_LEFT);
export const alignRightToolStateMachine = createAlignToolStateMachine(Tool.ALIGN_RIGHT);
export const alignTopToolStateMachine = createAlignToolStateMachine(Tool.ALIGN_TOP);
export const alignBottomToolStateMachine = createAlignToolStateMachine(Tool.ALIGN_BOTTOM);
export const alignCenterHorizontalToolStateMachine = createAlignToolStateMachine(
	Tool.ALIGN_CENTER_HORIZONTAL
);
export const alignCenterVerticalToolStateMachine = createAlignToolStateMachine(
	Tool.ALIGN_CENTER_VERTICAL
);
