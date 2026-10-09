import { compact } from 'es-toolkit';
import { HOVERED_SNAP_POINT_TIME, SNAP_POINT_DISTANCE } from '../App.consts.ts';
import { SnapPointType } from '../App.types.ts';
import {
	getAngleGuideOriginPoint,
	getAngleStep,
	getGridSettings,
	getHoveredSnapPoints,
	getScreenCanvasDrawController,
	getShouldDrawHelpers,
	getVisibleEntities,
	setAngleGuideEntities,
	setSnapPoint,
	setSnapPointOnAngleGuide,
} from '../state.ts';
import { getDrawHelpers } from './get-draw-guides.ts';
import { getClosestGridPoint, getGridSpacing } from './grid.ts';

/**
 * Calculate angle guides and snap points
 */
export function calculateAngleGuidesAndSnapPoints() {
	const angleStep = getAngleStep();
	const screenCanvasDrawController = getScreenCanvasDrawController();
	const entities = getVisibleEntities();
	const screenScale = screenCanvasDrawController.getScreenScale();
	const worldMouseLocation = screenCanvasDrawController.getWorldMouseLocation();
	const hoveredSnapPoints = getHoveredSnapPoints();

	const eligibleHoveredSnapPoints = hoveredSnapPoints.filter(
		(hoveredSnapPoint) => hoveredSnapPoint.milliSecondsHovered > HOVERED_SNAP_POINT_TIME
	);

	const eligibleHoveredPoints = eligibleHoveredSnapPoints.map(
		(hoveredSnapPoint) => hoveredSnapPoint.snapPoint.point
	);

	if (getShouldDrawHelpers()) {
		const { angleGuides, entitySnapPoint, angleSnapPoint } = getDrawHelpers(
			entities,
			compact([getAngleGuideOriginPoint(), ...eligibleHoveredPoints]),
			worldMouseLocation,
			angleStep,
			SNAP_POINT_DISTANCE / screenScale
		);
		setAngleGuideEntities(angleGuides);
		setSnapPointOnAngleGuide(angleSnapPoint);

		// Snap points on entities take priority over the grid
		if (!entitySnapPoint && getGridSettings().isSnapEnabled) {
			setSnapPoint({
				point: getClosestGridPoint(worldMouseLocation, getGridSpacing(screenScale)),
				type: SnapPointType.Grid,
			});
		} else {
			setSnapPoint(entitySnapPoint);
		}
	}
}
