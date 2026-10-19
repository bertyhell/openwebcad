import { toast } from 'react-toastify';
import { Actor, assign, createMachine } from 'xstate';
import type { Entity } from '../entities/Entity.ts';
import { PointEntity } from '../entities/PointEntity';
import { pickEntity } from '../helpers/pick-entity.ts';
import { getPathEdges, getPointsAtInterval } from '../helpers/points-at-interval.ts';
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
import type { MouseClickEvent, NumberInputEvent, StateEvent, ToolContext } from './tool.types';

/**
 * Don't add more points than this, eg: when the user types a very small interval by accident
 */
const MAX_MEASURE_POINTS = 10000;

export interface MeasureContext extends ToolContext {
	entity: Entity | null;
}

export enum MeasureState {
	INIT = 'INIT',
	WAITING_FOR_ENTITY = 'WAITING_FOR_ENTITY',
	WAITING_FOR_INTERVAL = 'WAITING_FOR_INTERVAL',
}

export enum MeasureAction {
	INIT_MEASURE_TOOL = 'INIT_MEASURE_TOOL',
	PICK_ENTITY = 'PICK_ENTITY',
	ADD_POINTS = 'ADD_POINTS',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

/**
 * Measure tool state machine
 * Places points along an entity at a fixed distance from each other, starting from the start of the entity
 */
export const measureToolStateMachine = createMachine(
	{
		types: {} as {
			context: MeasureContext;
			events: StateEvent;
		},
		context: {
			entity: null,
			type: Tool.MEASURE,
		},
		initial: MeasureState.INIT,
		states: {
			[MeasureState.INIT]: {
				description: 'Initializing the measure tool',
				always: {
					actions: MeasureAction.INIT_MEASURE_TOOL,
					target: MeasureState.WAITING_FOR_ENTITY,
				},
			},
			[MeasureState.WAITING_FOR_ENTITY]: {
				description: 'Select the entity to measure',
				meta: {
					instructions: 'Select the entity to place points along',
				},
				on: {
					MOUSE_CLICK: [
						{
							guard: ({ event }) => !!pickEntity((event as MouseClickEvent).worldMouseLocation),
							actions: MeasureAction.PICK_ENTITY,
							target: MeasureState.WAITING_FOR_INTERVAL,
						},
					],
					ESC: {
						actions: MeasureAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
			[MeasureState.WAITING_FOR_INTERVAL]: {
				description: 'Type the distance between the points',
				meta: {
					instructions: 'Type the distance between the points',
				},
				on: {
					NUMBER_INPUT: {
						actions: MeasureAction.ADD_POINTS,
						target: MeasureState.INIT,
					},
					ESC: {
						target: MeasureState.INIT,
					},
				},
			},
		},
	},
	{
		actions: {
			[MeasureAction.INIT_MEASURE_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
				return {
					entity: null,
				};
			}),
			[MeasureAction.PICK_ENTITY]: assign(({ event }) => {
				const entity = pickEntity((event as MouseClickEvent).worldMouseLocation);
				setSelectedEntityIds(entity ? [entity.id] : []);
				return {
					entity,
				};
			}),
			[MeasureAction.ADD_POINTS]: ({ context, event }) => {
				if (!context.entity) return;
				const interval = (event as NumberInputEvent).value;
				const edges = getPathEdges(context.entity);
				const pathLength = edges.reduce((length, edge) => length + edge.length, 0);
				if (interval <= 0 || pathLength / interval > MAX_MEASURE_POINTS) {
					toast.info(`Type a distance that gives at most ${MAX_MEASURE_POINTS} points`);
					return;
				}
				const points = getPointsAtInterval(edges, interval).map((point) => {
					const pointEntity = new PointEntity(point);
					pointEntity.lineColor = getActiveLineColor();
					return pointEntity;
				});
				if (!points.length) {
					toast.info('The entity is shorter than that distance');
					return;
				}
				addEntities(points, true);
			},
			[MeasureAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
