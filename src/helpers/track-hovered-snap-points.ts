import { HoverPoint, SnapPoint } from '../App.types';
import { pointDistance } from './distance-between-points';
import { HOVERED_SNAP_POINT_TIME, MAX_MARKED_SNAP_POINTS } from '../App.consts';

/**
 * Checks the current snap point every 100ms to mark certain snap points when they are hovered for a certain amount of time (marked)
 * So we can show extra angle guides for the ones that are marked
 */
export function trackHoveredSnapPoint(
  worldSnapPoint: SnapPoint | null,
  worldHoveredSnapPoints: HoverPoint[],
  setHoveredSnapPoints: (hoveredSnapPoints: HoverPoint[]) => void,
  maxHoverDistance: number,
  elapsedTime: number,
) {
  if (!worldSnapPoint) {
    return;
  }

  const lastHoveredPoint = worldHoveredSnapPoints.at(-1);
  let newHoverSnapPoints: HoverPoint[];

  // Angle guide points should never be marked
  if (lastHoveredPoint) {
    if (
      pointDistance(worldSnapPoint.point, lastHoveredPoint.snapPoint.point) <
      maxHoverDistance
    ) {
      // Last hovered snap point is still the current closest snap point
      // Increase the hover time
      newHoverSnapPoints = [
        ...worldHoveredSnapPoints.slice(0, worldHoveredSnapPoints.length - 1),
        {
          ...lastHoveredPoint,
          milliSecondsHovered:
            lastHoveredPoint.milliSecondsHovered + elapsedTime,
        },
      ];
    } else {
      // The closest snap point has changed
      // Check if the last snap point was hovered for long enough to be considered a marked snap point
      if (lastHoveredPoint.milliSecondsHovered >= HOVERED_SNAP_POINT_TIME) {
        // Append the new point to the list
        newHoverSnapPoints = [
          ...worldHoveredSnapPoints,
          {
            snapPoint: worldSnapPoint,
            milliSecondsHovered: elapsedTime,
          },
        ];
      } else {
        // Replace the last point with the new point
        newHoverSnapPoints = [
          ...worldHoveredSnapPoints.slice(0, worldHoveredSnapPoints.length - 1),
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

  const newHoverSnapPointsTruncated = newHoverSnapPoints.slice(
    0,
    MAX_MARKED_SNAP_POINTS,
  );
  setHoveredSnapPoints(newHoverSnapPointsTruncated);
}
