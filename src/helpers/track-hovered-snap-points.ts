import { HoverPoint, SnapPoint } from '../App.types.ts';
import { pointDistance } from './distance-between-points.ts';
import {
  HOVERED_SNAP_POINT_TIME,
  MAX_MARKED_SNAP_POINTS,
  SNAP_POINT_DISTANCE,
} from '../App.consts.ts';

/**
 * Checks the current snap point every 100ms to mark certain snap points when they are hovered for a certain amount of time (marked)
 * So we can show extra angle guides for the ones that are marked
 */
export function trackHoveredSnapPoint(
  snapPoint: SnapPoint | null,
  hoveredSnapPoints: HoverPoint[],
  setHoveredSnapPoints: (hoveredSnapPoints: HoverPoint[]) => void,
) {
  if (!snapPoint) {
    return;
  }

  const lastHoveredPoint = hoveredSnapPoints.at(-1);
  let newHoverSnapPoints: HoverPoint[];

  // Angle guide points should never be marked
  console.log('track hovered snap points: ', JSON.stringify(snapPoint), {
    distance: lastHoveredPoint
      ? pointDistance(snapPoint.point, lastHoveredPoint.snapPoint.point)
      : undefined,
  });

  if (lastHoveredPoint) {
    if (
      pointDistance(snapPoint.point, lastHoveredPoint.snapPoint.point) <
      SNAP_POINT_DISTANCE
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
        ...hoveredSnapPoints.slice(0, hoveredSnapPoints.length - 1),
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
            snapPoint,
            milliSecondsHovered: 100,
          }),
        );
        // Append the new point to the list
        newHoverSnapPoints = [
          ...hoveredSnapPoints,
          {
            snapPoint,
            milliSecondsHovered: 100,
          },
        ];
      } else {
        console.log(
          'REPLACE HOVERED SNAP POINT: ',
          JSON.stringify({
            snapPoint,
            milliSecondsHovered: 100,
          }),
        );
        // Replace the last point with the new point
        newHoverSnapPoints = [
          ...hoveredSnapPoints.slice(0, hoveredSnapPoints.length - 1),
          {
            snapPoint,
            milliSecondsHovered: 100,
          },
        ];
      }
    }
  } else {
    console.log(
      'BRAND NEW HOVERED SNAP POINT: ',
      JSON.stringify({
        snapPoint,
        milliSecondsHovered: 100,
      }),
      lastHoveredPoint,
    );
    // No snap points were hovered before
    newHoverSnapPoints = [
      {
        snapPoint,
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
