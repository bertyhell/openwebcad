import { toast } from 'react-toastify';
import { createMachine } from 'xstate';
import { createBoundaryPicker, edgesToPolyline } from '../helpers/boundary-picker.ts';
import {
	addEntities,
	getActiveLineColor,
	getActiveLineWidth,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { DrawEvent, MouseClickEvent, StateEvent, ToolContext } from './tool.types';

const boundaryPicker = createBoundaryPicker();

export enum BoundaryState {
	INIT = 'INIT',
	WAITING_FOR_CLICK = 'WAITING_FOR_CLICK',
}

export enum BoundaryAction {
	INIT_BOUNDARY_TOOL = 'INIT_BOUNDARY_TOOL',
	DRAW_TEMP_BOUNDARY = 'DRAW_TEMP_BOUNDARY',
	CREATE_BOUNDARY = 'CREATE_BOUNDARY',
}

/**
 * Boundary tool state machine
 * Clicking inside a closed area adds a polyline around that area, and around every hole inside it
 */
export const boundaryToolStateMachine = createMachine(
	{
		types: {} as {
			context: ToolContext;
			events: StateEvent;
		},
		context: {
			type: Tool.BOUNDARY,
		},
		initial: BoundaryState.INIT,
		states: {
			[BoundaryState.INIT]: {
				description: 'Initializing the boundary tool',
				always: {
					actions: BoundaryAction.INIT_BOUNDARY_TOOL,
					target: BoundaryState.WAITING_FOR_CLICK,
				},
			},
			[BoundaryState.WAITING_FOR_CLICK]: {
				description: 'Click in a closed area to create a polyline around it',
				meta: {
					instructions: 'Click in a closed area to create a polyline around it',
				},
				on: {
					DRAW: {
						actions: BoundaryAction.DRAW_TEMP_BOUNDARY,
					},
					MOUSE_CLICK: {
						actions: BoundaryAction.CREATE_BOUNDARY,
					},
				},
			},
		},
	},
	{
		actions: {
			[BoundaryAction.INIT_BOUNDARY_TOOL]: () => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				boundaryPicker.reset();
			},
			[BoundaryAction.DRAW_TEMP_BOUNDARY]: ({ event }) => {
				boundaryPicker.drawPreview((event as DrawEvent).drawController.getWorldMouseLocation());
			},
			[BoundaryAction.CREATE_BOUNDARY]: ({ event }) => {
				const boundary = boundaryPicker.findBoundaryAroundPoint(
					(event as MouseClickEvent).worldMouseLocation
				);
				if (!boundary) {
					toast.info('No closed area found around the clicked point');
					return;
				}
				const polylines = [boundary.boundary, ...boundary.holes].map((edges) => {
					const polyline = edgesToPolyline(edges);
					polyline.lineColor = getActiveLineColor();
					polyline.lineWidth = getActiveLineWidth();
					return polyline;
				});
				addEntities(polylines, true);
			},
		},
	}
);
