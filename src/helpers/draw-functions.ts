import { SnapPoint, SnapPointType } from '../App.types';
import { Entity } from '../entities/Entity';
import {
  CURSOR_SIZE,
  GUIDE_LINE_COLOR,
  GUIDE_LINE_STYLE,
  GUIDE_LINE_WIDTH,
  SNAP_POINT_COLOR,
  SNAP_POINT_SIZE,
} from '../App.consts';
import { isEntityHighlighted, isEntitySelected } from '../state';
import { Point } from '@flatten-js/core';
import { DrawController } from '../drawControllers/DrawController';
import { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController';

export function drawEntities(
  drawController: DrawController,
  entities: Entity[],
) {
  entities.forEach(entity => {
    drawController.setLineStyles(
      isEntityHighlighted(entity),
      isEntitySelected(entity),
      entity.lineColor,
      entity.lineWidth,
      [],
    );
    entity.draw(drawController);
  });
}

export function drawDebugEntities(
  drawController: DrawController,
  debugEntities: Entity[],
) {
  debugEntities.forEach(debugEntity => {
    drawController.setLineStyles(
      isEntityHighlighted(debugEntity),
      isEntitySelected(debugEntity),
      '#FF5500',
      1,
      [],
    );
    debugEntity.draw(drawController);
  });
}

/**
 * Draw the point to which the mouse will snap when the user clicks to draw the next point
 * @param drawController
 * @param snapPointInfo
 * @param isMarked indicates that the point has been hovered lang enough to draw guides from this point
 */
export function drawSnapPoint(
  drawController: ScreenCanvasDrawController,
  snapPointInfo: SnapPoint | null,
  isMarked: boolean,
) {
  if (!snapPointInfo) return;
  const snapPoint = snapPointInfo.point;
  const screenSnapPoint = drawController.worldToScreen(snapPoint);

  drawController.setLineStyles(false, false, SNAP_POINT_COLOR, 1, []);

  if (isMarked) {
    // We will draw a plus sign inside the current snap point to indicate that it is marked
    drawController.screenDrawLine(
      new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y),
      new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y),
    );
    drawController.screenDrawLine(
      new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
      new Point(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
    );
  }

  switch (snapPointInfo.type) {
    case SnapPointType.LineEndPoint:
      // Endpoint is marked with a square

      // top
      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
      );

      // right
      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      // bottom
      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      // left
      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      break;

    case SnapPointType.LineMidPoint:
      // Midpoint is shown with a triangle

      drawController.screenDrawLine(
        new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
        new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
      );
      break;

    case SnapPointType.AngleGuide:
      // Angle guide is shown with an hourglass

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
      );

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
      );
      break;

    case SnapPointType.Intersection:
      // Intersection is shown with a cross

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );

      drawController.screenDrawLine(
        new Point(
          screenSnapPoint.x + SNAP_POINT_SIZE / 2,
          screenSnapPoint.y - SNAP_POINT_SIZE / 2,
        ),
        new Point(
          screenSnapPoint.x - SNAP_POINT_SIZE / 2,
          screenSnapPoint.y + SNAP_POINT_SIZE / 2,
        ),
      );
      break;

    case SnapPointType.CircleCenter:
      // Circle center is shown with a circle
      drawController.drawArc(
        screenSnapPoint,
        SNAP_POINT_SIZE / 2,
        0,
        2 * Math.PI,
      );
      break;

    case SnapPointType.CircleCardinal:
      // Circle cardinal is shown with a diamond
      drawController.screenDrawLine(
        new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
        new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y),
      );
      drawController.screenDrawLine(
        new Point(screenSnapPoint.x - SNAP_POINT_SIZE / 2, screenSnapPoint.y),
        new Point(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
      );
      drawController.screenDrawLine(
        new Point(screenSnapPoint.x, screenSnapPoint.y + SNAP_POINT_SIZE / 2),
        new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y),
      );
      drawController.screenDrawLine(
        new Point(screenSnapPoint.x + SNAP_POINT_SIZE / 2, screenSnapPoint.y),
        new Point(screenSnapPoint.x, screenSnapPoint.y - SNAP_POINT_SIZE / 2),
      );
      break;
  }
}

export function drawHelpers(
  drawController: DrawController,
  helperEntities: Entity[],
) {
  helperEntities.forEach(entity => {
    drawController.setLineStyles(
      isEntityHighlighted(entity),
      isEntitySelected(entity),
      GUIDE_LINE_COLOR,
      GUIDE_LINE_WIDTH,
      GUIDE_LINE_STYLE,
    );
    entity.draw(drawController);
  });
}

export function drawCursor(
  drawController: ScreenCanvasDrawController,
  drawCursor: boolean,
) {
  if (!drawCursor) return;

  drawController.setLineStyles(false, false, '#FFF', 1, []);

  const screenMouseLocation = drawController.getScreenMouseLocation();

  drawController.screenDrawLine(
    new Point(screenMouseLocation.x, screenMouseLocation.y - CURSOR_SIZE),
    new Point(screenMouseLocation.x, screenMouseLocation.y + CURSOR_SIZE),
  );
  drawController.screenDrawLine(
    new Point(screenMouseLocation.x - CURSOR_SIZE, screenMouseLocation.y),
    new Point(screenMouseLocation.x + CURSOR_SIZE, screenMouseLocation.y),
  );
}
