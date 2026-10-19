import { Actor, createMachine } from 'xstate';
import {
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { StateEvent, ToolContext } from './tool.types';

export enum PanState {
	INIT = 'INIT',
	WAITING_FOR_DRAG = 'WAITING_FOR_DRAG',
}

export enum PanAction {
	INIT_PAN_TOOL = 'INIT_PAN_TOOL',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Pan tool state machine
 * The input controller pans the screen while the left mouse button is dragged and this tool is active
 */
export const panToolStateMachine = createMachine(
	{
		types: {} as {
			context: ToolContext;
			events: StateEvent;
		},
		context: {
			type: Tool.PAN,
		},
		initial: PanState.INIT,
		states: {
			[PanState.INIT]: {
				description: 'Initializing the pan tool',
				always: {
					actions: PanAction.INIT_PAN_TOOL,
					target: PanState.WAITING_FOR_DRAG,
				},
			},
			[PanState.WAITING_FOR_DRAG]: {
				description: 'Drag with the left mouse button to pan the screen',
				meta: {
					instructions: 'Drag to pan the screen, ESC or ENTER to stop',
				},
				on: {
					ESC: {
						actions: PanAction.SWITCH_TO_SELECT_TOOL,
					},
					ENTER: {
						actions: PanAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
		},
	},
	{
		actions: {
			[PanAction.INIT_PAN_TOOL]: () => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
			},
			[PanAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
