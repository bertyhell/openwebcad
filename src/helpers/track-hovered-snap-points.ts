import { HoverPoint, SnapPoint } from '../App.types.ts';
import { pointDistance } from './distance-between-points.ts';
import {
  HOVERED_SNAP_POINT_TIME,
  MAX_MARKED_SNAP_POINTS,
} from '../App.consts.ts';

/**
 * Checks the current snap point every 100ms to mark certain snap points when they are hovered for a certain amount of time (marked)
 * So we can show extra angle guides for the ones that are marked
 */
export function trackHoveredSnapPoint(
  worldSnapPoint: SnapPoint | null,
  worldHoveredSnapPoints: HoverPoint[],
  setHoveredSnapPoints: (hoveredSnapPoints: HoverPoint[]) => void,
  maxHoverDistance: number,
) {
  if (!worldSnapPoint) {
    return;
  }

  const lastHoveredPoint = worldHoveredSnapPoints.at(-1);
  let newHoverSnapPoints: HoverPoint[];

  // Angle guide points should never be marked
  console.log('track hovered snap points: ', JSON.stringify(worldSnapPoint), {
    distance: lastHoveredPoint
      ? pointDistance(worldSnapPoint.point, lastHoveredPoint.snapPoint.point)
      : undefined,
  });

  if (lastHoveredPoint) {
    if (
      pointDistance(worldSnapPoint.point, lastHoveredPoint.snapPoint.point) <
      maxHoverDistance
    ) {
      console.log(
        'INCREASE HOVER TIME: ',
        JSON.stringify({
          ...lastHoveredPoint,
          milliSecondsHovered: lastHoveredPoint.milliSecondsHovered + 100,
        }),
      );
      // Last hovered snap point is still the current closest snap point
      // Increase the hover time
      newHoverSnapPoints = [
        ...worldHoveredSnapPoints.slice(0, worldHoveredSnapPoints.length - 1),
        {
          ...lastHoveredPoint,
          milliSecondsHovered: lastHoveredPoint.milliSecondsHovered + 100,
        },
      ];
    } else {
      // The closest snap point has changed
      // Check if the last snap point was hovered for long enough to be considered a marked snap point
      if (lastHoveredPoint.milliSecondsHovered >= HOVERED_SNAP_POINT_TIME) {
        console.log(
          'NEW HOVERED SNAP POINT: ',
          JSON.stringify({
            snapPoint: worldSnapPoint,
            milliSecondsHovered: 100,
          }),
        );
        // Append the new point to the list
        newHoverSnapPoints = [
          ...worldHoveredSnapPoints,
          {
            snapPoint: worldSnapPoint,
            milliSecondsHovered: 100,
          },
        ];
      } else {
        console.log(
          'REPLACE HOVERED SNAP POINT: ',
          JSON.stringify({
            snapPoint: worldSnapPoint,
            milliSecondsHovered: 100,
          }),
        );
        // Replace the last point with the new point
        newHoverSnapPoints = [
          ...worldHoveredSnapPoints.slice(0, worldHoveredSnapPoints.length - 1),
          {
            snapPoint: worldSnapPoint,
            milliSecondsHovered: 100,
          },
        ];
      }
    }
  } else {
    console.log(
      'BRAND NEW HOVERED SNAP POINT: ',
      JSON.stringify({
        snapPoint: worldSnapPoint,
        milliSecondsHovered: 100,
      }),
      lastHoveredPoint,
    );
    // No snap points were hovered before
    newHoverSnapPoints = [
      {
        snapPoint: worldSnapPoint,
        milliSecondsHovered: 100,
      },
    ];
  }

  const newHoverSnapPointsTruncated = newHoverSnapPoints.slice(
    0,
    MAX_MARKED_SNAP_POINTS,
  );
  console.log('hovered snap points: ', newHoverSnapPointsTruncated);
  setHoveredSnapPoints(newHoverSnapPointsTruncated);
}
