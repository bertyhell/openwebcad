import { EPSILON, HOVERED_SNAP_POINT_TIME, MAX_MARKED_SNAP_POINTS } from '../App.consts';
import { type HoverPoint, type SnapPoint, SnapPointType } from '../App.types';
import { getToolSnapPoints, getVisibleEntities } from '../state';
import { pointDistance } from './distance-between-points';
import { isPointEqual } from './is-point-equal';
import { getEntitySnapPointIndex } from './snap-point-index';

function isMarked(hoverPoint: HoverPoint): boolean {
	return hoverPoint.milliSecondsHovered >= HOVERED_SNAP_POINT_TIME;
}

/**
 * Keep the newest marked snap points, and the point that is being hovered right now if it isn't marked yet
 * The oldest marked points make room for new ones, so the user can always mark the point they need next
 */
function keepNewestMarkedSnapPoints(hoverPoints: HoverPoint[]): HoverPoint[] {
	const lastHoverPoint = hoverPoints.at(-1);
	if (!lastHoverPoint || isMarked(lastHoverPoint)) {
		return hoverPoints.slice(-MAX_MARKED_SNAP_POINTS);
	}
	return [...hoverPoints.slice(0, -1).slice(-MAX_MARKED_SNAP_POINTS), lastHoverPoint];
}

/**
 * Whether the snap point still exists in the drawing, or is a point the active tool placed, eg: the first point of a spline
 * A snap point disappears when its entity is removed or changed, eg: after an undo or a move
 */
export function isSnapPointInDrawing(snapPoint: SnapPoint): boolean {
	return (
		!!getEntitySnapPointIndex(getVisibleEntities()).getClosestWithinRadius(
			snapPoint.point,
			EPSILON
		) ||
		getToolSnapPoints().some((toolSnapPoint) => isPointEqual(toolSnapPoint.point, snapPoint.point))
	);
}

/**
 * Checks the current snap point every frame to mark certain snap points when they are hovered for a certain amount of time (marked)
 * So we can show extra angle guides for the ones that are marked
 * @param isSnapPointAvailable points for which this returns false are forgotten, eg: because their entity was removed
 */
export function trackHoveredSnapPoint(
	worldSnapPoint: SnapPoint | null,
	worldHoveredSnapPoints: HoverPoint[],
	setHoveredSnapPoints: (hoveredSnapPoints: HoverPoint[]) => void,
	maxHoverDistance: number,
	elapsedTime: number,
	isSnapPointAvailable: (snapPoint: SnapPoint) => boolean = () => true
) {
	const availableHoveredSnapPoints = worldHoveredSnapPoints.filter((hoverPoint) =>
		isSnapPointAvailable(hoverPoint.snapPoint)
	);

	// Grid and angle guide points are everywhere, marking them would only push out the points the user wants
	if (
		!worldSnapPoint ||
		worldSnapPoint.type === SnapPointType.Grid ||
		worldSnapPoint.type === SnapPointType.AngleGuide
	) {
		if (availableHoveredSnapPoints.length !== worldHoveredSnapPoints.length) {
			setHoveredSnapPoints(availableHoveredSnapPoints);
		}
		return;
	}

	const lastHoveredPoint = availableHoveredSnapPoints.at(-1);
	let newHoverSnapPoints: HoverPoint[];

	if (lastHoveredPoint) {
		if (pointDistance(worldSnapPoint.point, lastHoveredPoint.snapPoint.point) < maxHoverDistance) {
			// Last hovered snap point is still the current closest snap point
			// Increase the hover time
			newHoverSnapPoints = [
				...availableHoveredSnapPoints.slice(0, -1),
				{
					...lastHoveredPoint,
					milliSecondsHovered: lastHoveredPoint.milliSecondsHovered + elapsedTime,
				},
			];
		} else {
			// The closest snap point has changed
			// Check if the last snap point was hovered for long enough to be considered a marked snap point
			if (isMarked(lastHoveredPoint)) {
				// Append the new point to the list
				newHoverSnapPoints = [
					...availableHoveredSnapPoints,
					{
						snapPoint: worldSnapPoint,
						milliSecondsHovered: elapsedTime,
					},
				];
			} else {
				// Replace the last point with the new point
				newHoverSnapPoints = [
					...availableHoveredSnapPoints.slice(0, -1),
					{
						snapPoint: worldSnapPoint,
						milliSecondsHovered: elapsedTime,
					},
				];
			}
		}
	} else {
		// No snap points were hovered before
		newHoverSnapPoints = [
			{
				snapPoint: worldSnapPoint,
				milliSecondsHovered: elapsedTime,
			},
		];
	}

	setHoveredSnapPoints(keepNewestMarkedSnapPoints(newHoverSnapPoints));
}

let trackedToolActor: unknown = null;

/**
 * Marked snap points help with the drawing step the user is busy with, so forget them when another tool starts
 */
export function forgetHoveredSnapPointsWhenToolChanges(
	activeToolActor: unknown,
	setHoveredSnapPoints: (hoveredSnapPoints: HoverPoint[]) => void
): void {
	if (activeToolActor === trackedToolActor) {
		return;
	}
	trackedToolActor = activeToolActor;
	setHoveredSnapPoints([]);
}
