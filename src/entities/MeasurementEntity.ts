import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint } from '../App.types.ts';
import { Box, Line, Point, Segment, Vector } from '@flatten-js/core';
import { scalePoint } from '../helpers/scale-point.ts';
import {
  MEASUREMENT_DECIMAL_PLACES,
  MEASUREMENT_EXTENSION_LENGTH,
  MEASUREMENT_LABEL_OFFSET,
  MEASUREMENT_ORIGIN_MARGIN,
} from '../App.consts.ts';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import {
  drawArrowHead,
  drawLine,
  drawText,
} from '../helpers/draw-functions.ts';
import { minBy, round } from 'es-toolkit';
import { pointDistance } from '../helpers/distance-between-points.ts';

export class MeasurementEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  private startPoint: Point;
  private endPoint: Point;
  private offsetPoint: Point;

  constructor(startPoint: Point, endPoint: Point, offsetPoint: Point) {
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.offsetPoint = offsetPoint;
  }

  private getDrawPoints() {
    const lineStartToEnd = new Line(this.startPoint, this.endPoint);
    const [, segment] = this.offsetPoint.distanceTo(lineStartToEnd);
    const closestPointToOffsetOnLine = segment.end;

    let vectorPerpendicularFromLineTowardsOffsetPoint;
    if (isPointEqual(closestPointToOffsetOnLine, this.offsetPoint)) {
      vectorPerpendicularFromLineTowardsOffsetPoint = lineStartToEnd.norm;
    } else {
      vectorPerpendicularFromLineTowardsOffsetPoint = new Vector(
        closestPointToOffsetOnLine,
        this.offsetPoint,
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
        vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(
          MEASUREMENT_ORIGIN_MARGIN,
        ),
      );

    const offsetEndPointMargin = this.endPoint
      .clone()
      .translate(
        vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(
          MEASUREMENT_ORIGIN_MARGIN,
        ),
      );

    // End of the perpendicular lines
    const offsetStartPointExtend = offsetStartPoint
      .clone()
      .translate(
        vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(
          MEASUREMENT_EXTENSION_LENGTH,
        ),
      );

    const offsetEndPointExtend = offsetEndPoint
      .clone()
      .translate(
        vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(
          MEASUREMENT_EXTENSION_LENGTH,
        ),
      );

    // Location for label
    const midpointMeasurementLine = new Point(
      (offsetStartPoint.x + offsetEndPoint.x) / 2,
      (offsetStartPoint.y + offsetEndPoint.y) / 2,
    );
    const midpointMeasurementLineOffset = midpointMeasurementLine
      .clone()
      .translate(
        vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(
          MEASUREMENT_LABEL_OFFSET,
        ),
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
   * @param drawInfo
   */
  public draw(drawInfo: DrawInfo): void {
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

    drawArrowHead(drawInfo.context, offsetStartPoint, offsetEndPoint);
    drawArrowHead(drawInfo.context, offsetEndPoint, offsetStartPoint);
    drawLine(drawInfo.context, offsetStartPoint, offsetEndPoint);
    drawLine(drawInfo.context, offsetStartPointMargin, offsetStartPointExtend);
    drawLine(drawInfo.context, offsetEndPointMargin, offsetEndPointExtend);

    const distance = round(
      pointDistance(this.startPoint, this.endPoint),
      MEASUREMENT_DECIMAL_PLACES,
    );
    drawText(
      drawInfo.context,
      String(distance),
      midpointMeasurementLineOffset,
      normalUnit.rotate90CCW(),
    );
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

  public clone(): MeasurementEntity {
    return new MeasurementEntity(
      this.startPoint.clone(),
      this.endPoint.clone(),
      this.offsetPoint.clone(),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public intersectsWithBox(_box: Box): boolean {
    throw new Error(
      'intersectsWithBox for MeasurementEntity not yet implemented',
    );
    // return this.segment.intersect(box).length > 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public isContainedInBox(_box: Box): boolean {
    throw new Error(
      'isContainedInBox for MeasurementEntity not yet implemented',
    );
    // return box.contains(this.segment);
  }

  public getBoundingBox(): Box | null {
    throw new Error('getBoundingBox for MeasurementEntity not yet implemented');
    // return this.segment.box;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const lineStartToEnd = new Line(offsetStartPoint, offsetEndPoint);
    const horizontalLineDistanceInfo = lineStartToEnd.distanceTo(shape);

    const leftVerticalLine = new Line(
      offsetStartPointMargin,
      offsetStartPointExtend,
    );
    const leftVerticalLineDistanceInfo = leftVerticalLine.distanceTo(shape);

    const rightVerticalLine = new Line(
      offsetEndPointMargin,
      offsetEndPointExtend,
    );
    const rightVerticalLineDistanceInfo = rightVerticalLine.distanceTo(shape);

    return minBy(
      [
        horizontalLineDistanceInfo,
        leftVerticalLineDistanceInfo,
        rightVerticalLineDistanceInfo,
      ],
      distanceInfo => distanceInfo[0],
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
  public containsPointOnShape(_point: Point): boolean {
    throw new Error(
      'containsPointOnShape for MeasurementEntity not yet implemented',
    );
    // return this.segment.contains(point);
  }

  public async toJson(): Promise<JsonEntity<MeasurementJsonData> | null> {
    return {
      id: this.id,
      type: EntityName.Measurement,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      shapeData: {
        startPoint: { x: this.startPoint.x, y: this.startPoint.y },
        endPoint: { x: this.endPoint.x, y: this.endPoint.y },
        offsetPoint: { x: this.offsetPoint.x, y: this.offsetPoint.y },
      },
    };
  }

  public static async fromJson(
    jsonEntity: JsonEntity<MeasurementJsonData>,
  ): Promise<MeasurementEntity> {
    const startPoint = new Point(
      jsonEntity.shapeData.startPoint.x,
      jsonEntity.shapeData.startPoint.y,
    );
    const endPoint = new Point(
      jsonEntity.shapeData.endPoint.x,
      jsonEntity.shapeData.endPoint.y,
    );
    const offsetPoint = new Point(
      jsonEntity.shapeData.offsetPoint.x,
      jsonEntity.shapeData.offsetPoint.y,
    );
    const measurementEntity = new MeasurementEntity(
      startPoint,
      endPoint,
      offsetPoint,
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
