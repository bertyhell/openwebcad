import type { Point } from '@flatten-js/core';
import { SNAP_POINT_DISTANCE } from '../App.consts';
import { type SnapPoint, SnapPointType } from '../App.types';
import {
	getGridSettings,
	getScreenCanvasDrawController,
	getShouldDrawHelpers,
	getSnapPoint,
	getSnapPointOnAngleGuide,
} from '../state';
import { pointDistance } from './distance-between-points';
import { getClosestGridPoint, getGridSpacing } from './grid';

/**
 * The snap point that a click uses right now, the snap marker and the previews of the tools show the same one
 * 1. a snap point of an entity, eg: the end point of a line
 * 2. a snap point on an angle guide
 * 3. the closest grid point, when snapping to the grid is enabled
 * Snap points are calculated when the mouse moves, a snap point that is no longer close to the mouse is skipped. eg: after panning with the arrow keys
 */
export function getActiveSnapPoint(): SnapPoint | null {
	if (!getShouldDrawHelpers()) {
		return null;
	}
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const worldMouseLocation = screenCanvasDrawController.getWorldMouseLocation();
	const screenScale = screenCanvasDrawController.getScreenScale();
	const isCloseToMouse = (snapPoint: SnapPoint | null): snapPoint is SnapPoint =>
		!!snapPoint &&
		pointDistance(snapPoint.point, worldMouseLocation) < SNAP_POINT_DISTANCE / screenScale;

	const entitySnapPoint = getSnapPoint();
	if (entitySnapPoint?.type !== SnapPointType.Grid && isCloseToMouse(entitySnapPoint)) {
		return entitySnapPoint;
	}
	const angleGuideSnapPoint = getSnapPointOnAngleGuide();
	if (isCloseToMouse(angleGuideSnapPoint)) {
		return angleGuideSnapPoint;
	}
	if (getGridSettings().isSnapEnabled) {
		// The grid point is always used, it can be further away than the snap distance when zoomed out.
		// Calculate it for the current mouse location, the view can have changed since the mouse last moved
		return {
			point: getClosestGridPoint(worldMouseLocation, getGridSpacing(screenScale)),
			type: SnapPointType.Grid,
		};
	}
	return null;
}

/**
 * The location a click would pick right now: the active snap point, or the mouse location when there is none
 */
export function getSnappedMouseLocation(): Point {
	return getActiveSnapPoint()?.point ?? getScreenCanvasDrawController().getWorldMouseLocation();
}

// /**
//  * Some points need to take priority over others when snapping to them. This multiplier is used to give a higher score to the points that should take priority
//  */
// const SNAP_POINT_PRIORITY: Record<SnapPointType, number> = {
//   [SnapPointType.AngleGuide]: 1,
//   [SnapPointType.LineEndPoint]: 5,
//   [SnapPointType.Intersection]: 2,
//   [SnapPointType.CircleCenter]: 3,
//   [SnapPointType.CircleCardinal]: 3,
//   [SnapPointType.CircleTangent]: 2,
//   [SnapPointType.LineMidPoint]: 4,
//   [SnapPointType.Point]: 5,
// };

/**
 * Finds the closest snap point to the target point
 * @param worldSnapPoints
 * @param worldMouseLocation
 */
export function getClosestSnapPoint(
	worldSnapPoints: SnapPoint[],
	worldMouseLocation: Point
): { distance: number; snapPoint: SnapPoint | null } {
	let closestSnapPoint: SnapPoint | null = null;
	let closestDistance: number = Number.POSITIVE_INFINITY;

	for (const snapPoint1 of worldSnapPoints) {
		const distance = pointDistance(snapPoint1.point, worldMouseLocation);

		if (distance < closestDistance) {
			closestDistance = distance;
			closestSnapPoint = snapPoint1;
		}
	}

	return {
		distance: closestDistance,
		snapPoint: closestSnapPoint,
	};
}

/**
 * First checks non angle guide snap points, then checks angle guide snap points
 * @param worldSnapPoints
 * @param worldMouseLocation
 * @param maxDistance
 */
export function getClosestSnapPointWithinRadius(
	worldSnapPoints: SnapPoint[],
	worldMouseLocation: Point,
	maxDistance: number
): SnapPoint | null {
	const { distance: closestDistance, snapPoint: closestSnapPoint } = getClosestSnapPoint(
		worldSnapPoints.filter((snapPoint) => snapPoint.type !== SnapPointType.AngleGuide),
		worldMouseLocation
	);

	if (closestDistance < maxDistance) {
		return closestSnapPoint;
	}

	const { distance: angleGuideDistance, snapPoint: angleGuideSnapPoint } = getClosestSnapPoint(
		worldSnapPoints.filter((snapPoint) => snapPoint.type === SnapPointType.AngleGuide),
		worldMouseLocation
	);

	if (angleGuideDistance < maxDistance) {
		return angleGuideSnapPoint;
	}

	return null;
}
