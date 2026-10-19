import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { EntityName } from '../entities/Entity';
import {
	applyCorner,
	type CornerTarget,
	CornerType,
	createCorner,
	createCornersAtSharedPoints,
	getCornerTarget,
} from '../helpers/corner-entities';
import { pickEntity } from '../helpers/pick-entity';
import {
	getEditableEntities,
	getEntities,
	getGhostHelperEntities,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { drawTempSelectionRectangle, getEntitiesInsideRectangle } from './select-tool.helpers';
import type {
	DrawEvent,
	MouseClickEvent,
	NumberInputEvent,
	StateEvent,
	ToolContext,
} from './tool.types';

export interface CornerContext extends ToolContext {
	value: number;
	firstLine: CornerTarget | null;
	/**
	 * First corner of the selection box, when the user selects multiple corners at once
	 */
	boxStartPoint: Point | null;
}

export enum CornerState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_LINE = 'WAITING_FOR_FIRST_LINE',
	WAITING_FOR_SECOND_LINE = 'WAITING_FOR_SECOND_LINE',
	WAITING_FOR_BOX_END = 'WAITING_FOR_BOX_END',
}

export enum CornerAction {
	INIT_CORNER_TOOL = 'INIT_CORNER_TOOL',
	RECORD_VALUE = 'RECORD_VALUE',
	HIGHLIGHT_LINE = 'HIGHLIGHT_LINE',
	RECORD_FIRST_LINE = 'RECORD_FIRST_LINE',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	CREATE_CORNER = 'CREATE_CORNER',
	RECORD_BOX_START = 'RECORD_BOX_START',
	DRAW_BOX_PREVIEW = 'DRAW_BOX_PREVIEW',
	CREATE_BOX_CORNERS = 'CREATE_BOX_CORNERS',
}

const CORNER_ENTITY_TYPES = [EntityName.Line, EntityName.Rectangle, EntityName.PolyLine];

/**
 * The line, or straight segment of a rectangle or polyline, under the mouse
 * Other entities can't be filleted or chamfered
 */
function pickLine(worldPoint: Point): CornerTarget | null {
	const candidates = getEditableEntities().filter((entity) =>
		CORNER_ENTITY_TYPES.includes(entity.getType())
	);
	const entity = pickEntity(worldPoint, candidates);
	return entity ? getCornerTarget(entity, worldPoint) : null;
}

/**
 * The corners between the lines inside the selection box
 */
function getBoxCorners(context: CornerContext, cornerType: CornerType, boxEndPoint: Point) {
	const selectedEntities = getEntitiesInsideRectangle(context.boxStartPoint as Point, boxEndPoint);
	return {
		selectedEntities,
		...createCornersAtSharedPoints(selectedEntities, getEntities(), cornerType, context.value),
	};
}

function getCorner(context: CornerContext, cornerType: CornerType, secondClickPoint: Point) {
	const secondLine = pickLine(secondClickPoint);
	if (!context.firstLine || !secondLine) {
		return null;
	}
	return createCorner(context.firstLine, secondLine, cornerType, context.value);
}

/**
 * Creates the fillet or chamfer tool
 * The user types a radius or distance (or keeps the last one) and clicks two lines on the parts that should be kept
 * Straight segments of rectangles and polylines count as lines
 * Clicking next to the lines starts a selection box, every corner where two selected lines meet is rounded or cut off
 * The lines are trimmed or extended to the corner, which is rounded (fillet) or cut off (chamfer)
 */
function createCornerToolStateMachine(tool: Tool, cornerType: CornerType, valueName: string) {
	return createMachine(
		{
			types: {} as {
				context: CornerContext;
				events: StateEvent;
			},
			context: {
				value: 0,
				firstLine: null,
				boxStartPoint: null,
				type: tool,
			},
			initial: CornerState.INIT,
			states: {
				[CornerState.INIT]: {
					description: `Initializing the ${tool.toLowerCase()} tool`,
					always: {
						actions: CornerAction.INIT_CORNER_TOOL,
						target: CornerState.WAITING_FOR_FIRST_LINE,
					},
				},
				[CornerState.WAITING_FOR_FIRST_LINE]: {
					description: 'Select the first line',
					meta: {
						instructions: `Select the first line, drag a box over the corners, or type the ${valueName}`,
					},
					on: {
						DRAW: { actions: CornerAction.HIGHLIGHT_LINE },
						NUMBER_INPUT: {
							guard: ({ event }) => (event as NumberInputEvent).value >= 0,
							actions: CornerAction.RECORD_VALUE,
						},
						MOUSE_CLICK: [
							{
								guard: ({ event }) => !!pickLine((event as MouseClickEvent).worldMouseLocation),
								actions: CornerAction.RECORD_FIRST_LINE,
								target: CornerState.WAITING_FOR_SECOND_LINE,
							},
							{
								actions: CornerAction.RECORD_BOX_START,
								target: CornerState.WAITING_FOR_BOX_END,
							},
						],
					},
				},
				[CornerState.WAITING_FOR_BOX_END]: {
					description: 'Select the second point of the selection box',
					meta: {
						instructions: 'Select the second point of the selection box',
					},
					on: {
						DRAW: { actions: CornerAction.DRAW_BOX_PREVIEW },
						MOUSE_CLICK: {
							actions: CornerAction.CREATE_BOX_CORNERS,
							target: CornerState.INIT,
						},
						ESC: { target: CornerState.INIT },
					},
				},
				[CornerState.WAITING_FOR_SECOND_LINE]: {
					description: 'Select the second line',
					meta: {
						instructions: 'Select the second line',
					},
					on: {
						DRAW: { actions: CornerAction.DRAW_PREVIEW },
						MOUSE_CLICK: {
							guard: ({ event }) => !!pickLine((event as MouseClickEvent).worldMouseLocation),
							actions: CornerAction.CREATE_CORNER,
							target: CornerState.INIT,
						},
						ESC: { target: CornerState.INIT },
					},
				},
			},
		},
		{
			actions: {
				[CornerAction.INIT_CORNER_TOOL]: assign(() => {
					setShouldDrawHelpers(false);
					setGhostHelperEntities([]);
					setHighlightedEntityIds([]);
					setAngleGuideOriginPoint(null);
					return { firstLine: null, boxStartPoint: null };
				}),
				[CornerAction.RECORD_VALUE]: assign(({ event }) => {
					const value = (event as NumberInputEvent).value;
					toast.info(`${valueName[0].toUpperCase()}${valueName.slice(1)}: ${value}`);
					return { value };
				}),
				[CornerAction.HIGHLIGHT_LINE]: ({ event }) => {
					const line = pickLine((event as DrawEvent).drawController.getWorldMouseLocation());
					setHighlightedEntityIds(line ? [line.entity.id] : []);
				},
				[CornerAction.RECORD_FIRST_LINE]: assign(({ event }) => {
					return { firstLine: pickLine((event as MouseClickEvent).worldMouseLocation) };
				}),
				[CornerAction.RECORD_BOX_START]: assign(({ event }) => {
					setHighlightedEntityIds([]);
					return { boxStartPoint: (event as MouseClickEvent).worldMouseLocation };
				}),
				[CornerAction.DRAW_BOX_PREVIEW]: ({ context, event }) => {
					const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
					drawTempSelectionRectangle(context.boxStartPoint as Point, mouseLocation);
					// Only preview the new connectors, the trimmed lines are hard to see under the original lines
					const { selectedEntities, connectors } = getBoxCorners(
						context,
						cornerType,
						mouseLocation
					);
					setHighlightedEntityIds(selectedEntities.map((entity) => entity.id));
					for (const connector of connectors) {
						connector.lineDash = [4, 4];
					}
					setGhostHelperEntities([...getGhostHelperEntities(), ...connectors]);
				},
				[CornerAction.CREATE_BOX_CORNERS]: ({ context, event }) => {
					if (context.value <= 0) {
						toast.info(`Type the ${valueName} first, a corner of 0 changes nothing`);
						return;
					}
					const { entities, connectors, skippedCount } = getBoxCorners(
						context,
						cornerType,
						(event as MouseClickEvent).worldMouseLocation
					);
					if (skippedCount) {
						toast.info(
							`Skipped ${skippedCount} corner${skippedCount === 1 ? '' : 's'}: the ${valueName} is too large or the lines are parallel`
						);
					}
					if (!connectors.length) {
						if (!skippedCount) {
							toast.info('No corners found where two of the selected lines meet');
						}
						return;
					}
					setEntities(entities, true);
				},
				[CornerAction.DRAW_PREVIEW]: ({ context, event }) => {
					const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
					const secondLine = pickLine(mouseLocation);
					setHighlightedEntityIds(
						[context.firstLine?.entity.id, secondLine?.entity.id].filter((id): id is string => !!id)
					);
					const corner = getCorner(context, cornerType, mouseLocation);
					if (!corner || 'error' in corner) {
						setGhostHelperEntities([]);
						return;
					}
					const preview = [...corner.lines, ...(corner.connector ? [corner.connector] : [])];
					for (const entity of preview) {
						entity.lineDash = [4, 4];
					}
					setGhostHelperEntities(preview);
				},
				[CornerAction.CREATE_CORNER]: ({ context, event }) => {
					const clickPoint = (event as MouseClickEvent).worldMouseLocation;
					const corner = getCorner(context, cornerType, clickPoint);
					const secondLine = pickLine(clickPoint);
					if (!corner || !context.firstLine || !secondLine) {
						return;
					}
					if ('error' in corner) {
						toast.info(corner.error);
						return;
					}
					setEntities(applyCorner(getEntities(), context.firstLine, secondLine, corner), true);
				},
			},
		}
	);
}

export const filletToolStateMachine = createCornerToolStateMachine(
	Tool.FILLET,
	CornerType.FILLET,
	'radius'
);

export const chamferToolStateMachine = createCornerToolStateMachine(
	Tool.CHAMFER,
	CornerType.CHAMFER,
	'distance'
);
