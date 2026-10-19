import { Point, Segment } from '@flatten-js/core';
import type { Edge } from '../App.types.ts';
import { ArcEntity } from '../entities/ArcEntity';
import { type Entity, EntityName } from '../entities/Entity.ts';
import { LineEntity } from '../entities/LineEntity';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import {
	getActiveLineColor,
	getLayers,
	getVisibleEntities,
	setGhostHelperEntities,
} from '../state';
import {
	type CandidateLoop,
	findCandidateLoops,
	findEnclosingBoundaryInLoops,
} from './find-enclosing-boundary.ts';
import type { BoundaryWithHoles } from './find-loops-in-edges.types.ts';
import { isPointEqual } from './is-point-equal.ts';

const BOUNDARY_PREVIEW_LINE_WIDTH = 3;
const BOUNDARY_PREVIEW_LINE_DASH = [5, 5];

export interface BoundaryPicker {
	/**
	 * Forget the cached loops, eg: when the tool is activated again
	 */
	reset(): void;
	/**
	 * The closed boundary (and its holes) around the point, or null if the point isn't inside a closed area
	 */
	findBoundaryAroundPoint(point: Point): BoundaryWithHoles | null;
	/**
	 * Highlight the boundary (and holes) around the mouse
	 */
	drawPreview(worldMouseLocation: Point): void;
}

/**
 * Get the edges that can be part of a boundary
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

export function edgesToPolyline(edges: Edge[]): PolyLineEntity {
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
 * Finds closed areas around a point, used by tools where the user clicks inside an area. eg: hatch, boundary, area
 * Finding all loops in the drawing is expensive, so we only do it again when the entities change
 * Finding the boundary around the mouse is cheaper, but we still only do it again when the mouse moves
 */
export function createBoundaryPicker(): BoundaryPicker {
	let loopsCache: { entities: Entity[]; loops: CandidateLoop[] } | null = null;
	let previewCache: { entities: Entity[]; mouseLocation: Point } | null = null;

	function getCandidateLoops(): CandidateLoop[] {
		const entities = getVisibleEntities();
		if (loopsCache?.entities !== entities) {
			loopsCache = {
				entities,
				loops: findCandidateLoops(getBoundaryEdges(entities)),
			};
		}
		return loopsCache.loops;
	}

	function findBoundaryAroundPoint(point: Point): BoundaryWithHoles | null {
		try {
			return findEnclosingBoundaryInLoops(point, getCandidateLoops());
		} catch (err) {
			console.error('Failed to find enclosing boundary around point', point, err);
			return null;
		}
	}

	return {
		reset() {
			loopsCache = null;
			previewCache = null;
		},
		findBoundaryAroundPoint,
		drawPreview(worldMouseLocation: Point) {
			const entities = getVisibleEntities();
			if (
				previewCache?.entities === entities &&
				isPointEqual(previewCache.mouseLocation, worldMouseLocation)
			) {
				return;
			}
			previewCache = {
				entities,
				mouseLocation: new Point(worldMouseLocation.x, worldMouseLocation.y),
			};

			const boundary = findBoundaryAroundPoint(worldMouseLocation);
			if (!boundary) {
				setGhostHelperEntities([]);
				return;
			}

			const previewPolylines = [boundary.boundary, ...boundary.holes].map((edges) => {
				const polyline = edgesToPolyline(edges);
				polyline.lineColor = getActiveLineColor();
				polyline.lineWidth = BOUNDARY_PREVIEW_LINE_WIDTH;
				polyline.lineDash = BOUNDARY_PREVIEW_LINE_DASH;
				return polyline;
			});
			setGhostHelperEntities(previewPolylines);
		},
	};
}
