import {Box, Line, Point, Segment, Vector} from '@flatten-js/core';
import {minBy, round} from 'es-toolkit';
import {max, min} from 'es-toolkit/compat';
import {
	ARROW_HEAD_LENGTH,
	ARROW_HEAD_WIDTH,
	MEASUREMENT_DECIMAL_PLACES,
	MEASUREMENT_EXTENSION_LENGTH,
	MEASUREMENT_FONT_SIZE,
	MEASUREMENT_LABEL_OFFSET,
	MEASUREMENT_ORIGIN_MARGIN,
	TO_RADIANS,
	EPSILON,
} from '../App.consts';
import type {Shape, SnapPoint} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {pointDistance} from '../helpers/distance-between-points';
import {isPointEqual} from '../helpers/is-point-equal';
import {mirrorPointOverAxis} from '../helpers/mirror-point-over-axis.ts';
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';
import type {LineEntity} from './LineEntity.ts';

export class MeasurementEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private startPoint: Point;
	private endPoint: Point;
	private offsetPoint: Point;

	constructor(layerId: string, startPoint: Point, endPoint: Point, offsetPoint: Point) {
		this.layerId = layerId;
		this.startPoint = startPoint;
		this.endPoint = endPoint;
		this.offsetPoint = offsetPoint;
	}

	private getDrawPoints() {
		const lineStartToEnd = new Line(this.startPoint, this.endPoint);
		const [, segment] = this.offsetPoint.distanceTo(lineStartToEnd);
		const closestPointToOffsetOnLine = segment.end;

		let vectorPerpendicularFromLineTowardsOffsetPoint: Vector;
		if (isPointEqual(closestPointToOffsetOnLine, this.offsetPoint)) {
			vectorPerpendicularFromLineTowardsOffsetPoint = lineStartToEnd.norm;
		} else {
			vectorPerpendicularFromLineTowardsOffsetPoint = new Vector(
				closestPointToOffsetOnLine,
				this.offsetPoint
			);
		}

		const vectorPerpendicularFromLineTowardsOffsetPointUnit =
			vectorPerpendicularFromLineTowardsOffsetPoint.normalize();

		// Points for horizontal measurement line
		const offsetStartPoint = this.startPoint
			.clone()
			.translate(vectorPerpendicularFromLineTowardsOffsetPoint);
		const offsetEndPoint = this.endPoint
			.clone()
			.translate(vectorPerpendicularFromLineTowardsOffsetPoint);

		// Start of the perpendicular lines
		const offsetStartPointMargin = this.startPoint
			.clone()
			.translate(
				vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(MEASUREMENT_ORIGIN_MARGIN)
			);

		const offsetEndPointMargin = this.endPoint
			.clone()
			.translate(
				vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(MEASUREMENT_ORIGIN_MARGIN)
			);

		// End of the perpendicular lines
		const offsetStartPointExtend = offsetStartPoint
			.clone()
			.translate(
				vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(MEASUREMENT_EXTENSION_LENGTH)
			);

		const offsetEndPointExtend = offsetEndPoint
			.clone()
			.translate(
				vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(MEASUREMENT_EXTENSION_LENGTH)
			);

		// Location for label
		const midpointMeasurementLine = new Point(
			(offsetStartPoint.x + offsetEndPoint.x) / 2,
			(offsetStartPoint.y + offsetEndPoint.y) / 2
		);
		const textHeight = MEASUREMENT_FONT_SIZE;
		const totalOffset = MEASUREMENT_LABEL_OFFSET + textHeight / 2;
		const midpointMeasurementLineOffset = midpointMeasurementLine
			.clone()
			.translate(
				vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(totalOffset)
			);

		return {
			offsetStartPoint,
			offsetEndPoint,
			offsetStartPointExtend,
			offsetEndPointExtend,
			offsetStartPointMargin,
			offsetEndPointMargin,
			midpointMeasurementLineOffset,
			normalUnit: vectorPerpendicularFromLineTowardsOffsetPointUnit,
		};
	}

	/**
	 * Draws an arrow head which ends at the endPoint
	 * The start point doesn't really matter, only the direction
	 * the size of the arrow is determined by ARROW_HEAD_SIZE
	 * @param drawController
	 * @param startPoint
	 * @param endPoint
	 */
	private drawArrowHead = (
		drawController: DrawController,
		startPoint: Point,
		endPoint: Point
	): void => {
		const screenScale = drawController.getScreenScale();
		const vectorFromEndToStart = new Vector(endPoint, startPoint);
		const vectorFromEndToStartUnit = vectorFromEndToStart.normalize();
		const baseOfArrow = endPoint
			.clone()
			.translate(vectorFromEndToStartUnit.multiply(ARROW_HEAD_LENGTH * screenScale));
		const perpendicularVector1 = vectorFromEndToStartUnit.rotate(90 * TO_RADIANS);
		const perpendicularVector2 = vectorFromEndToStartUnit.rotate(-90 * TO_RADIANS);
		const leftCornerOfArrow = baseOfArrow
			.clone()
			.translate(perpendicularVector1.multiply(ARROW_HEAD_WIDTH * screenScale));
		const rightCornerOfArrow = baseOfArrow
			.clone()
			.translate(perpendicularVector2.multiply(ARROW_HEAD_WIDTH * screenScale));

		drawController.setLineStyles(false, false, this.lineColor, this.lineWidth, []);
		drawController.drawLine(endPoint, leftCornerOfArrow);
		drawController.drawLine(endPoint, rightCornerOfArrow);
		drawController.drawLine(leftCornerOfArrow, rightCornerOfArrow);
		drawController.setFillStyles(this.lineColor);
		drawController.fillPolygon(endPoint, leftCornerOfArrow, rightCornerOfArrow);
	};

	/**
	 * Drawing of measurement:
	 *
	 *                            offsetPoint           offsetEndPoint
	 *                                      __x___--->x
	 *    offsetStartPoint       ______-----           \
	 *                     x<----                       \
	 *                      \                            x
	 *                       \                             endPoint
	 *                        x
	 *                          startPoint
	 *
	 * @param drawController
	 */
	public draw(drawController: DrawController): void {
		if (isPointEqual(this.startPoint, this.endPoint)) {
			return; // We can't draw a measurement with 0 length
		}
		drawController.setLineStyles(
			isEntityHighlighted(this),
			isEntitySelected(this),
			this.lineColor,
			this.lineWidth,
			this.lineDash
		);
		drawController.setFillStyles(this.lineColor);
		const drawPoints = this.getDrawPoints();
		if (!drawPoints) {
			return;
		}
		const {
			offsetStartPoint,
			offsetEndPoint,
			offsetStartPointExtend,
			offsetEndPointExtend,
			offsetStartPointMargin,
			offsetEndPointMargin,
			midpointMeasurementLineOffset,
			normalUnit,
		} = drawPoints;

		this.drawArrowHead(drawController, offsetStartPoint, offsetEndPoint);
		this.drawArrowHead(drawController, offsetEndPoint, offsetStartPoint);
		drawController.drawLine(offsetStartPoint, offsetEndPoint);
		drawController.drawLine(offsetStartPointMargin, offsetStartPointExtend);
		drawController.drawLine(offsetEndPointMargin, offsetEndPointExtend);

		const distance = String(
			round(pointDistance(this.startPoint, this.endPoint), MEASUREMENT_DECIMAL_PLACES)
		);
		const originalTextDirection = normalUnit.rotate90CW();
		let finalTextDirection = originalTextDirection;
		if (
			originalTextDirection.x < -EPSILON ||
			(Math.abs(originalTextDirection.x) < EPSILON && originalTextDirection.y > EPSILON)
		) {
			finalTextDirection = new Vector(-originalTextDirection.x, -originalTextDirection.y);
		}
		drawController.drawText(distance, midpointMeasurementLineOffset, {
			textAlign: 'center',
			textDirection: finalTextDirection,
			fontSize: MEASUREMENT_FONT_SIZE,
			textColor: this.lineColor,
		});
	}

	public move(x: number, y: number) {
		this.startPoint = this.startPoint.translate(x, y);
		this.endPoint = this.endPoint.translate(x, y);
		this.offsetPoint = this.offsetPoint.translate(x, y);
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		this.startPoint = scalePoint(this.startPoint, scaleOrigin, scaleFactor);
		this.endPoint = scalePoint(this.endPoint, scaleOrigin, scaleFactor);
		this.offsetPoint = scalePoint(this.offsetPoint, scaleOrigin, scaleFactor);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.startPoint = this.startPoint.rotate(angle, rotateOrigin);
		this.endPoint = this.endPoint.rotate(angle, rotateOrigin);
		this.offsetPoint = this.offsetPoint.rotate(angle, rotateOrigin);
	}

	public mirror(mirrorAxis: LineEntity) {
		this.startPoint = mirrorPointOverAxis(this.startPoint, mirrorAxis);
		this.endPoint = mirrorPointOverAxis(this.endPoint, mirrorAxis);
		this.offsetPoint = mirrorPointOverAxis(this.offsetPoint, mirrorAxis);
	}

	public clone(): MeasurementEntity {
		return new MeasurementEntity(
			getActiveLayerId(),
			this.startPoint.clone(),
			this.endPoint.clone(),
			this.offsetPoint.clone()
		);
	}

	public intersectsWithBox(box: Box): boolean {
		const drawPoints = this.getDrawPoints();

		const measurementLines = [
			new Segment(drawPoints.offsetStartPoint, drawPoints.offsetEndPoint),
			new Segment(drawPoints.offsetStartPointMargin, drawPoints.offsetStartPointExtend),
			new Segment(drawPoints.offsetEndPointMargin, drawPoints.offsetEndPointExtend),
		];

		for (const line of measurementLines) {
			if (line.intersect(box).length > 0) {
				return true;
			}
			if (box.contains(line)) {
				return true;
			}
		}

		return false;
	}

	public isContainedInBox(box: Box): boolean {
		const drawPoints = this.getDrawPoints();

		const measurementLines = [
			new Segment(drawPoints.offsetStartPoint, drawPoints.offsetEndPoint),
			new Segment(drawPoints.offsetStartPointMargin, drawPoints.offsetStartPointExtend),
			new Segment(drawPoints.offsetEndPointMargin, drawPoints.offsetEndPointExtend),
		];

		for (const line of measurementLines) {
			if (!box.contains(line)) {
				return false;
			}
		}

		return true;
	}

	public getBoundingBox(): Box {
		const drawPoints = this.getDrawPoints();

		const lineExtremePoints = [
			drawPoints.offsetStartPointMargin,
			drawPoints.offsetStartPointExtend,
			drawPoints.offsetEndPointMargin,
			drawPoints.offsetEndPointExtend,
			// Also include the main measurement line itself in the bounding box calculation for lines
			drawPoints.offsetStartPoint,
			drawPoints.offsetEndPoint,
		];

		// Calculate text properties
		const distance = String(
			round(pointDistance(this.startPoint, this.endPoint), MEASUREMENT_DECIMAL_PLACES)
		);
		const textHeight = MEASUREMENT_FONT_SIZE;
		// Estimate width: textString.length * fontSize * aspectRatioFactor
		const textWidth = distance.length * MEASUREMENT_FONT_SIZE * 0.6;

		const {midpointMeasurementLineOffset, normalUnit} = drawPoints;

		// Determine text direction (similar to draw method)
		const originalTextDirection = normalUnit.rotate90CW();
		let finalTextDirection = originalTextDirection;
		if (
			originalTextDirection.x < -EPSILON ||
			(Math.abs(originalTextDirection.x) < EPSILON && originalTextDirection.y > EPSILON)
		) {
			finalTextDirection = new Vector(-originalTextDirection.x, -originalTextDirection.y);
		}

		// Text center
		const textCenterX = midpointMeasurementLineOffset.x;
		const textCenterY = midpointMeasurementLineOffset.y;

		// Half dimensions
		const halfTextWidth = textWidth / 2;
		const halfTextHeight = textHeight / 2;

		// Text corner calculations
		// Vector along the text direction for width, and perpendicular for height
		const dirVec = finalTextDirection.normalize(); // Vector along the text direction
		const perpVec = dirVec.rotate90CW(); // Vector perpendicular to text direction (for height offset)

		const textCorners = [
			new Point(
				textCenterX - dirVec.x * halfTextWidth - perpVec.x * halfTextHeight,
				textCenterY - dirVec.y * halfTextWidth - perpVec.y * halfTextHeight
			),
			new Point(
				textCenterX + dirVec.x * halfTextWidth - perpVec.x * halfTextHeight,
				textCenterY + dirVec.y * halfTextWidth - perpVec.y * halfTextHeight
			),
			new Point(
				textCenterX + dirVec.x * halfTextWidth + perpVec.x * halfTextHeight,
				textCenterY + dirVec.y * halfTextWidth + perpVec.y * halfTextHeight
			),
			new Point(
				textCenterX - dirVec.x * halfTextWidth + perpVec.x * halfTextHeight,
				textCenterY - dirVec.y * halfTextWidth + perpVec.y * halfTextHeight
			),
		];

		const allExtremePoints = [...lineExtremePoints, ...textCorners];

		return new Box(
			min(allExtremePoints.map((point) => point.x)),
			min(allExtremePoints.map((point) => point.y)),
			max(allExtremePoints.map((point) => point.x)),
			max(allExtremePoints.map((point) => point.y))
		);
	}

	public getShape(): Shape | null {
		return null;
	}

	public getSnapPoints(): SnapPoint[] {
		return [];
	}

	public getIntersections(): Point[] {
		return [];
	}

	public getFirstPoint(): Point | null {
		return this.startPoint;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const drawPoints = this.getDrawPoints();
		if (!drawPoints) {
			return null;
		}
		const {
			offsetStartPoint,
			offsetEndPoint,
			offsetStartPointExtend,
			offsetEndPointExtend,
			offsetStartPointMargin,
			offsetEndPointMargin,
		} = drawPoints;

		const mainSegment = new Segment(offsetStartPoint, offsetEndPoint);
		const horizontalLineDistanceInfo = mainSegment.distanceTo(shape);

		const leftExtensionSegment = new Segment(offsetStartPointMargin, offsetStartPointExtend);
		const leftVerticalLineDistanceInfo = leftExtensionSegment.distanceTo(shape);

		const rightExtensionSegment = new Segment(offsetEndPointMargin, offsetEndPointExtend);
		const rightVerticalLineDistanceInfo = rightExtensionSegment.distanceTo(shape);

		return minBy(
			[horizontalLineDistanceInfo, leftVerticalLineDistanceInfo, rightVerticalLineDistanceInfo],
			(distanceInfo) => distanceInfo[0]
		);
	}

	public getSvgString(): string | null {
		throw new Error('getSvgString for MeasurementEntity not yet implemented');
		// return (
		//   this.segment.svg({
		//     strokeWidth: this.lineWidth,
		//     stroke: getExportColor(this.lineColor),
		//   }) || null
		// );
	}

	public getType(): EntityName {
		return EntityName.Measurement;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public containsPointOnShape(point: Point): boolean {
		const drawPoints = this.getDrawPoints();

		if (!drawPoints) {
			return false; // No visual representation, so no point can be on it.
		}

		const {
			offsetStartPoint,
			offsetEndPoint,
			offsetStartPointMargin,
			offsetStartPointExtend,
			offsetEndPointMargin,
			offsetEndPointExtend,
		} = drawPoints;

		const measurementLine = new Segment(offsetStartPoint, offsetEndPoint);
		if (measurementLine.contains(point)) {
			return true;
		}

		const extensionLine1 = new Segment(offsetStartPointMargin, offsetStartPointExtend);
		if (extensionLine1.contains(point)) {
			return true;
		}

		const extensionLine2 = new Segment(offsetEndPointMargin, offsetEndPointExtend);
		if (extensionLine2.contains(point)) {
			return true;
		}

		return false;
	}

	public async toJson(): Promise<JsonEntity<MeasurementJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Measurement,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				startPoint: { x: this.startPoint.x, y: this.startPoint.y },
				endPoint: { x: this.endPoint.x, y: this.endPoint.y },
				offsetPoint: { x: this.offsetPoint.x, y: this.offsetPoint.y },
			},
		};
	}

	public static async fromJson(
		jsonEntity: JsonEntity<MeasurementJsonData>
	): Promise<MeasurementEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Measurement: missing shapeData');
		}
		const startPoint = new Point(
			jsonEntity.shapeData.startPoint.x,
			jsonEntity.shapeData.startPoint.y
		);
		const endPoint = new Point(jsonEntity.shapeData.endPoint.x, jsonEntity.shapeData.endPoint.y);
		const offsetPoint = new Point(
			jsonEntity.shapeData.offsetPoint.x,
			jsonEntity.shapeData.offsetPoint.y
		);
		const measurementEntity = new MeasurementEntity(
			jsonEntity.layerId || getActiveLayerId(),
			startPoint,
			endPoint,
			offsetPoint
		);
		measurementEntity.id = jsonEntity.id;
		measurementEntity.lineColor = jsonEntity.lineColor;
		measurementEntity.lineWidth = jsonEntity.lineWidth;
		return measurementEntity;
	}
}

export interface MeasurementJsonData {
	startPoint: { x: number; y: number };
	endPoint: { x: number; y: number };
	offsetPoint: { x: number; y: number };
}
