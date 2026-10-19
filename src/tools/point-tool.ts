import { Actor, createMachine } from 'xstate';
import { PointEntity } from '../entities/PointEntity';
import { getPointFromEvent } from '../helpers/get-point-from-event.ts';
import {
	addEntities,
	getActiveLineColor,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { PointInputEvent, StateEvent, ToolContext } from './tool.types';

export enum PointState {
	INIT = 'INIT',
	WAITING_FOR_POINT = 'WAITING_FOR_POINT',
}

export enum PointAction {
	INIT_POINT_TOOL = 'INIT_POINT_TOOL',
	ADD_POINT = 'ADD_POINT',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Point tool state machine
 * Every click or typed coordinate adds a point
 */
export const pointToolStateMachine = createMachine(
	{
		types: {} as {
			context: ToolContext;
			events: StateEvent;
		},
		context: {
			type: Tool.POINT,
		},
		initial: PointState.INIT,
		states: {
			[PointState.INIT]: {
				description: 'Initializing the point tool',
				always: {
					actions: PointAction.INIT_POINT_TOOL,
					target: PointState.WAITING_FOR_POINT,
				},
			},
			[PointState.WAITING_FOR_POINT]: {
				description: 'Select the location of the point',
				meta: {
					instructions: 'Select the location of the point',
				},
				on: {
					MOUSE_CLICK: {
						actions: PointAction.ADD_POINT,
					},
					ABSOLUTE_POINT_INPUT: {
						actions: PointAction.ADD_POINT,
					},
					ESC: {
						actions: PointAction.SWITCH_TO_SELECT_TOOL,
					},
					ENTER: {
						actions: PointAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
		},
	},
	{
		actions: {
			[PointAction.INIT_POINT_TOOL]: () => {
				setShouldDrawHelpers(true);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
			},
			[PointAction.ADD_POINT]: ({ event }) => {
				const pointEntity = new PointEntity(getPointFromEvent(null, event as PointInputEvent));
				pointEntity.lineColor = getActiveLineColor();
				addEntities([pointEntity], true);
			},
			[PointAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
