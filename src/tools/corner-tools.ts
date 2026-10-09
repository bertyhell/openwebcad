import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { EntityName } from '../entities/Entity';
import type { LineEntity } from '../entities/LineEntity';
import { type CornerLine, CornerType, createCorner } from '../helpers/corner-entities';
import { pickEntity } from '../helpers/pick-entity';
import {
	getEditableEntities,
	getEntities,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type {
	DrawEvent,
	MouseClickEvent,
	NumberInputEvent,
	StateEvent,
	ToolContext,
} from './tool.types';
import { replaceEntities } from './transform-tool.helpers';

export interface CornerContext extends ToolContext {
	value: number;
	firstLine: CornerLine | null;
}

export enum CornerState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_LINE = 'WAITING_FOR_FIRST_LINE',
	WAITING_FOR_SECOND_LINE = 'WAITING_FOR_SECOND_LINE',
}

export enum CornerAction {
	INIT_CORNER_TOOL = 'INIT_CORNER_TOOL',
	RECORD_VALUE = 'RECORD_VALUE',
	HIGHLIGHT_LINE = 'HIGHLIGHT_LINE',
	RECORD_FIRST_LINE = 'RECORD_FIRST_LINE',
	DRAW_PREVIEW = 'DRAW_PREVIEW',
	CREATE_CORNER = 'CREATE_CORNER',
}

/**
 * The line under the mouse, other entities can't be filleted or chamfered
 */
function pickLine(worldPoint: Point): LineEntity | null {
	const lines = getEditableEntities().filter((entity) => entity.getType() === EntityName.Line);
	return pickEntity(worldPoint, lines) as LineEntity | null;
}

function getCorner(context: CornerContext, cornerType: CornerType, secondClickPoint: Point) {
	const secondLine = pickLine(secondClickPoint);
	if (!context.firstLine || !secondLine) {
		return null;
	}
	return createCorner(
		context.firstLine,
		{ line: secondLine, clickPoint: secondClickPoint },
		cornerType,
		context.value
	);
}

/**
 * Creates the fillet or chamfer tool
 * The user types a radius or distance (or keeps the last one) and clicks two lines on the parts that should be kept
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
						instructions: `Select the first line, or type the ${valueName}`,
					},
					on: {
						DRAW: { actions: CornerAction.HIGHLIGHT_LINE },
						NUMBER_INPUT: {
							guard: ({ event }) => (event as NumberInputEvent).value >= 0,
							actions: CornerAction.RECORD_VALUE,
						},
						MOUSE_CLICK: {
							guard: ({ event }) => !!pickLine((event as MouseClickEvent).worldMouseLocation),
							actions: CornerAction.RECORD_FIRST_LINE,
							target: CornerState.WAITING_FOR_SECOND_LINE,
						},
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
					return { firstLine: null };
				}),
				[CornerAction.RECORD_VALUE]: assign(({ event }) => {
					const value = (event as NumberInputEvent).value;
					toast.info(`${valueName[0].toUpperCase()}${valueName.slice(1)}: ${value}`);
					return { value };
				}),
				[CornerAction.HIGHLIGHT_LINE]: ({ event }) => {
					const line = pickLine((event as DrawEvent).drawController.getWorldMouseLocation());
					setHighlightedEntityIds(line ? [line.id] : []);
				},
				[CornerAction.RECORD_FIRST_LINE]: assign(({ event }) => {
					const clickPoint = (event as MouseClickEvent).worldMouseLocation;
					const line = pickLine(clickPoint) as LineEntity;
					return { firstLine: { line, clickPoint } };
				}),
				[CornerAction.DRAW_PREVIEW]: ({ context, event }) => {
					const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
					const secondLine = pickLine(mouseLocation);
					setHighlightedEntityIds(
						[context.firstLine?.line.id, secondLine?.id].filter((id): id is string => !!id)
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
					const corner = getCorner(
						context,
						cornerType,
						(event as MouseClickEvent).worldMouseLocation
					);
					if (!corner || !context.firstLine) {
						return;
					}
					if ('error' in corner) {
						toast.info(corner.error);
						return;
					}
					const secondLine = pickLine((event as MouseClickEvent).worldMouseLocation) as LineEntity;
					const newEntities = replaceEntities(
						getEntities(),
						[context.firstLine.line, secondLine],
						corner.lines
					);
					setEntities(corner.connector ? [...newEntities, corner.connector] : newEntities, true);
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
