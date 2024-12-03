import {
  getAngleGuideOriginPoint,
  getAngleStep,
  getEntities,
  getHoveredSnapPoints,
  getScreenCanvasDrawController,
  getShouldDrawHelpers,
  setAngleGuideEntities,
  setSnapPoint,
  setSnapPointOnAngleGuide,
} from '../state.ts';
import { HOVERED_SNAP_POINT_TIME, SNAP_POINT_DISTANCE } from '../App.consts.ts';
import { getDrawHelpers } from './get-draw-guides.ts';
import { compact } from 'es-toolkit';

/**
 * Calculate angle guides and snap points
 */
export function calculateAngleGuidesAndSnapPoints() {
  const angleStep = getAngleStep();
  const screenCanvasDrawController = getScreenCanvasDrawController();
  const entities = getEntities();
  const screenScale = screenCanvasDrawController.getScreenScale();
  const worldMouseLocation = screenCanvasDrawController.getWorldMouseLocation();
  const hoveredSnapPoints = getHoveredSnapPoints();

  const eligibleHoveredSnapPoints = hoveredSnapPoints.filter(
    hoveredSnapPoint =>
      hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME,
  );

  const eligibleHoveredPoints = eligibleHoveredSnapPoints.map(
    hoveredSnapPoint => hoveredSnapPoint.snapPoint.point,
  );

  if (getShouldDrawHelpers()) {
    const { angleGuides, entitySnapPoint, angleSnapPoint } = getDrawHelpers(
      entities,
      compact([getAngleGuideOriginPoint(), ...eligibleHoveredPoints]),
      worldMouseLocation,
      angleStep,
      SNAP_POINT_DISTANCE / screenScale,
    );
    setAngleGuideEntities(angleGuides);
    setSnapPoint(entitySnapPoint);
    setSnapPointOnAngleGuide(angleSnapPoint);
  }
}
