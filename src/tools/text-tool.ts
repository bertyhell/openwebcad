import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { TextEntity } from '../entities/TextEntity';
import { applyActiveStyle } from '../helpers/apply-active-style';
import { getPointFromEvent } from '../helpers/get-point-from-event';
import {
	addEntities,
	getInputController,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type {
	NumberInputEvent,
	PointInputEvent,
	StateEvent,
	TextInputEvent,
	ToolContext,
} from './tool.types';

/**
 * Height of new texts in world units, until the user types another height
 */
export const DEFAULT_TEXT_HEIGHT = 20;

export interface TextContext extends ToolContext {
	basePoint: Point | null;
	height: number;
}

export enum TextState {
	INIT = 'INIT',
	WAITING_FOR_BASE_POINT = 'WAITING_FOR_BASE_POINT',
	WAITING_FOR_LABEL = 'WAITING_FOR_LABEL',
}

export enum TextAction {
	INIT_TEXT_TOOL = 'INIT_TEXT_TOOL',
	RECORD_HEIGHT = 'RECORD_HEIGHT',
	RECORD_BASE_POINT = 'RECORD_BASE_POINT',
	DRAW_TEMP_TEXT = 'DRAW_TEMP_TEXT',
	ADD_TEXT = 'ADD_TEXT',
}

function createText(label: string, basePoint: Point, height: number): TextEntity {
	return applyActiveStyle(
		new TextEntity(label, basePoint, { fontSize: height, textAlign: 'left' })
	);
}

/**
 * Text tool state machine
 * 1. The user clicks where the text starts (or types a number first to change the text height)
 * 2. The user types the text and presses ENTER
 */
export const textToolStateMachine = createMachine(
	{
		types: {} as {
			context: TextContext;
			events: StateEvent;
		},
		context: {
			basePoint: null,
			height: DEFAULT_TEXT_HEIGHT,
			type: Tool.TEXT,
		},
		initial: TextState.INIT,
		states: {
			[TextState.INIT]: {
				description: 'Initializing the text tool',
				always: {
					actions: TextAction.INIT_TEXT_TOOL,
					target: TextState.WAITING_FOR_BASE_POINT,
				},
			},
			[TextState.WAITING_FOR_BASE_POINT]: {
				description: 'Select where the text starts',
				meta: {
					instructions: 'Select where the text starts, or type the text height',
				},
				on: {
					NUMBER_INPUT: {
						guard: ({ event }) => (event as NumberInputEvent).value > 0,
						actions: TextAction.RECORD_HEIGHT,
					},
					MOUSE_CLICK: {
						actions: TextAction.RECORD_BASE_POINT,
						target: TextState.WAITING_FOR_LABEL,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: TextAction.RECORD_BASE_POINT,
						target: TextState.WAITING_FOR_LABEL,
					},
				},
			},
			[TextState.WAITING_FOR_LABEL]: {
				description: 'Type the text',
				meta: {
					instructions: 'Type the text, then ENTER',
				},
				on: {
					DRAW: { actions: TextAction.DRAW_TEMP_TEXT },
					// Any typed text, including numbers, is the label of the text
					TEXT_INPUT: {
						actions: TextAction.ADD_TEXT,
						target: TextState.INIT,
					},
					ENTER: { target: TextState.INIT },
					ESC: { target: TextState.INIT },
				},
			},
		},
	},
	{
		actions: {
			[TextAction.INIT_TEXT_TOOL]: assign(() => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return { basePoint: null };
			}),
			[TextAction.RECORD_HEIGHT]: assign(({ event }) => {
				const height = (event as NumberInputEvent).value;
				toast.info(`Text height: ${height}`);
				return { height };
			}),
			[TextAction.RECORD_BASE_POINT]: assign(({ event }) => {
				setShouldDrawHelpers(false);
				return { basePoint: getPointFromEvent(null, event as PointInputEvent) };
			}),
			[TextAction.DRAW_TEMP_TEXT]: ({ context }) => {
				if (!context.basePoint) return;
				// Preview the text while the user is typing it
				const label = getInputController().getText() || 'Text';
				setGhostHelperEntities([createText(label, context.basePoint, context.height)]);
			},
			[TextAction.ADD_TEXT]: ({ context, event }) => {
				const label = (event as TextInputEvent).value;
				if (!context.basePoint || !label.trim()) return;
				addEntities([createText(label, context.basePoint, context.height)], true);
			},
		},
	}
);
