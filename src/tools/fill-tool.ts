import type { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import { EntityName } from '../entities/Entity.ts';
import { FillEntity } from '../entities/FillEntity.ts';
import { createBoundaryPicker, edgesToPolyline } from '../helpers/boundary-picker.ts';
import {
	getActiveFillColor,
	getActiveLineColor,
	getEntities,
	setEntities,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { DrawEvent, MouseClickEvent, StateEvent, ToolContext } from './tool.types';

const fillBoundaryPicker = createBoundaryPicker();

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

/**
 * Fill tool state machine
 * - While moving the mouse, the closed boundary around the mouse is highlighted
 * - Clicking fills the area inside that boundary with the active color, excluding holes inside the boundary
 */
export const fillToolStateMachine = createMachine(
	{
		types: {} as {
			context: FillContext;
			events: StateEvent;
		},
		context: {
			startPoint: null,
			type: Tool.HATCH,
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
		},
	},
	{
		actions: {
			[FillAction.INIT_FILL_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				fillBoundaryPicker.reset();
				return {};
			}),
			[FillAction.DRAW_TEMP_BOUNDARY]: assign(({ context, event }) => {
				fillBoundaryPicker.drawPreview((event as DrawEvent).drawController.getWorldMouseLocation());
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
	const boundary = fillBoundaryPicker.findBoundaryAroundPoint(worldMouseLocation);
	if (!boundary) {
		toast.info('No closed area found around the clicked point');
		return;
	}

	const fillEntity = new FillEntity(
		edgesToPolyline(boundary.boundary),
		boundary.holes.map(edgesToPolyline)
	);
	fillEntity.fillColor = getActiveFillColor();
	fillEntity.lineColor = getActiveLineColor();

	// Fills are drawn below all other entities, so the boundary lines stay visible
	// But on top of earlier fills, so you can change the color of an area by filling it again
	const entities = getEntities();
	const insertIndex = entities.findLastIndex((entity) => entity.getType() === EntityName.Fill) + 1;
	setEntities(
		[...entities.slice(0, insertIndex), fillEntity, ...entities.slice(insertIndex)],
		true
	);
}
