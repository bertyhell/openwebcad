import { Point, Segment } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { assign, createMachine } from 'xstate';
import type { Edge } from '../App.types.ts';
import { ArcEntity } from '../entities/ArcEntity';
import { type Entity, EntityName } from '../entities/Entity.ts';
import { FillEntity } from '../entities/FillEntity.ts';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import {
	type CandidateLoop,
	findCandidateLoops,
	findEnclosingBoundaryInLoops,
} from '../helpers/find-enclosing-boundary.ts';
import type { BoundaryWithHoles } from '../helpers/find-loops-in-edges.types.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import {
	getActiveLineColor,
	getEntities,
	getLayers,
	setEntities,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import type { DrawEvent, MouseClickEvent, StateEvent, ToolContext } from './tool.types';

const FILL_PREVIEW_LINE_WIDTH = 3;
const FILL_PREVIEW_LINE_DASH = [5, 5];

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
		},
	},
	{
		actions: {
			[FillAction.INIT_FILL_TOOL]: assign(() => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				resetFillToolCache();
				return {};
			}),
			[FillAction.DRAW_TEMP_BOUNDARY]: assign(({ context, event }) => {
				drawBoundaryPreview((event as DrawEvent).drawController.getWorldMouseLocation());
				return context;
			}),
			[FillAction.HANDLE_MOUSE_CLICK]: assign(({ context, event }) => {
				handleMouseClick((event as MouseClickEvent).worldMouseLocation);
				return context;
			}),
		},
	}
);

/**
 * Finding all loops in the drawing is expensive, so we only do it again when the entities change
 * Finding the boundary around the mouse is cheaper, but we still only do it again when the mouse moves
 */
let loopsCache: { entities: Entity[]; loops: CandidateLoop[] } | null = null;
let previewCache: { entities: Entity[]; mouseLocation: Point } | null = null;

function resetFillToolCache() {
	loopsCache = null;
	previewCache = null;
}

function getCandidateLoops(): CandidateLoop[] {
	const entities = getEntities();
	if (loopsCache?.entities !== entities) {
		loopsCache = {
			entities,
			loops: findCandidateLoops(getBoundaryEdges(entities)),
		};
	}
	return loopsCache.loops;
}

/**
 * Get the edges that can be part of a fill boundary
 * Fills themselves are not boundaries, and entities on hidden layers are ignored
 */
function getBoundaryEdges(entities: Entity[]): Edge[] {
	const visibleLayerIds = getLayers()
		.filter((layer) => layer.isVisible)
		.map((layer) => layer.id);
	return entities
		.filter(
			(entity) => entity.getType() !== EntityName.Fill && visibleLayerIds.includes(entity.layerId)
		)
		.flatMap((entity) => entity.getEdges());
}

function findBoundaryAroundPoint(point: Point): BoundaryWithHoles | null {
	try {
		return findEnclosingBoundaryInLoops(point, getCandidateLoops());
	} catch (err) {
		console.error('Failed to find enclosing boundary around point', point, err);
		return null;
	}
}

function edgesToPolyline(edges: Edge[]): PolyLineEntity {
	return new PolyLineEntity(
		edges.map((edge) => {
			if (edge instanceof Segment) {
				return new LineEntity(edge);
			}
			return new ArcEntity(edge);
		})
	);
}

/**
 * Highlight the boundary (and holes) that will be filled if the user clicks
 */
function drawBoundaryPreview(worldMouseLocation: Point) {
	const entities = getEntities();
	if (
		previewCache?.entities === entities &&
		isPointEqual(previewCache.mouseLocation, worldMouseLocation)
	) {
		return;
	}
	previewCache = { entities, mouseLocation: new Point(worldMouseLocation.x, worldMouseLocation.y) };

	const boundary = findBoundaryAroundPoint(worldMouseLocation);
	if (!boundary) {
		setGhostHelperEntities([]);
		return;
	}

	const previewPolylines = [boundary.boundary, ...boundary.holes].map((edges) => {
		const polyline = edgesToPolyline(edges);
		polyline.lineColor = getActiveLineColor();
		polyline.lineWidth = FILL_PREVIEW_LINE_WIDTH;
		polyline.lineDash = FILL_PREVIEW_LINE_DASH;
		return polyline;
	});
	setGhostHelperEntities(previewPolylines);
}

export function handleMouseClick(worldMouseLocation: Point) {
	const boundary = findBoundaryAroundPoint(worldMouseLocation);
	if (!boundary) {
		toast.info('No closed area found around the clicked point');
		return;
	}

	const fillEntity = new FillEntity(
		edgesToPolyline(boundary.boundary),
		boundary.holes.map(edgesToPolyline)
	);
	fillEntity.fillColor = getActiveLineColor();
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
