import {type Point, Segment} from '@flatten-js/core';
import {compact} from 'es-toolkit';
import {assign, createMachine} from 'xstate';
import {ArcEntity} from '../entities/ArcEntity';
import {FillEntity} from '../entities/FillEntity.ts';
import {LineEntity} from '../entities/LineEntity';
import {PolyLineEntity} from '../entities/PolyLineEntity.ts';
import {findEnclosingBoundary} from '../helpers/find-enclosing-boundary.ts';
import {addEntities, getEntities, setGhostHelperEntities, setShouldDrawHelpers,} from '../state';
import {Tool} from '../tools';
import type {DrawEvent, MouseClickEvent, StateEvent, ToolContext} from './tool.types';

export interface FillContext extends ToolContext {
	startPoint: Point | null;
}

export enum FillState {
	INIT = 'INIT',
	WAITING_FOR_FIRST_CLICK = 'WAITING_FOR_FIRST_CLICK',
}

export enum FillAction {
	INIT_FILL_TOOL = 'INIT_FILL_TOOL',
	HANDLE_MOUSE_CLICK = 'HANDLE_MOUSE_CLICK',
	DRAW_TEMP_BOUNDARY = 'DRAW_TEMP_BOUNDARY',
}

export const fillToolStateMachine = createMachine(
	{
		types: {} as {
			context: FillContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			type: Tool.FILL,
		},
		initial: FillState.INIT,
		states: {
			[FillState.INIT]: {
				description: 'Initializing the fill tool',
				always: {
					actions: FillAction.INIT_FILL_TOOL,
					target: FillState.WAITING_FOR_FIRST_CLICK,
				},
			},
			[FillState.WAITING_FOR_FIRST_CLICK]: {
				description: 'Click in a closed area to fill that area',
				meta: {
					instructions: 'Click in a closed area to fill that area',
				},
				on: {
					DRAW: {
						actions: FillAction.DRAW_TEMP_BOUNDARY,
					},
					MOUSE_CLICK: {
						actions: FillAction.HANDLE_MOUSE_CLICK,
						target: FillState.WAITING_FOR_FIRST_CLICK,
					},
				},
			},
			// TODO implement rectangle selection to delete
		},
	},
	{
		actions: {
			[FillAction.INIT_FILL_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				return {};
			}),
			[FillAction.DRAW_TEMP_BOUNDARY]: assign(({ context, event }) => {
				// // Draw ticker dashed line for which boundary the fill would be executed if the user clicks
				const mouseLocation = (event as DrawEvent).drawController.getWorldMouseLocation();
				const boundary = findEnclosingBoundary(
					mouseLocation,
					compact(getEntities().flatMap((entity) => entity.getEdges()))
				);
				if (boundary) {
					const boundaryEntities = boundary.map((edge) => {
						if (edge instanceof Segment) {
							return new LineEntity(edge);
						}
						return new ArcEntity(edge);
					});
					const polylineEntity = new PolyLineEntity(boundaryEntities);
					polylineEntity.lineColor = '#FFF';
					polylineEntity.lineWidth = 5;
					polylineEntity.lineDash = undefined;
					setGhostHelperEntities([polylineEntity]);
				}

				return context;
			}),
			[FillAction.HANDLE_MOUSE_CLICK]: assign(({ context, event }) => {
				handleMouseClick((event as MouseClickEvent).worldMouseLocation);

				return context;
			}),
		},
	}
);

export function handleMouseClick(worldMouseLocation: Point) {
	const boundary = findEnclosingBoundary(
		worldMouseLocation,
		compact(getEntities().flatMap((entity) => entity.getEdges()))
	);

	if (boundary) {
		// Fill boundary
		const polylineBoundary = new PolyLineEntity(
			boundary.map((edge) => {
				if (edge instanceof Segment) {
					return new LineEntity(edge);
				}
				return new ArcEntity(edge);
			})
		);
		addEntities([new FillEntity(polylineBoundary)], true);
	} else {
		// Do nothing
	}
}
