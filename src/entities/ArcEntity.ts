import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import { Arc, Box, Line, Point, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { pointDistance } from '../helpers/distance-between-points.ts';
import { uniqWith } from 'es-toolkit';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import { sortPointsOnArc } from '../helpers/sort-points-on-arc.ts';
import { getExportColor } from '../helpers/get-export-color.ts';

export class ArcEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  private arc: Arc | null = null;
  private centerPoint: Point | null = null;
  private firstPoint: Point | null = null;

  public static getAngle(centerPoint: Point, pointOnArc: Point): number {
    return new Line(centerPoint, pointOnArc).slope;
  }

  constructor(
    centerPoint: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterClockwise: boolean = true,
  ) {
    this.centerPoint = centerPoint;
    this.arc = new Arc(
      centerPoint,
      radius,
      startAngle,
      endAngle,
      counterClockwise,
    );
    this.firstPoint = this.arc.start;
  }

  public draw(drawInfo: DrawInfo): void {
    if (!this.centerPoint) {
      return;
    }

    let radiusTemp: number;
    if (this.arc) {
      // Draw the circle with the center point and the radius
      radiusTemp = this.arc.r.valueOf();
    } else if (this.centerPoint && this.firstPoint) {
      // Draw the circle with the center point and the distance between the center and the mouse as the radius
      radiusTemp = pointDistance(this.centerPoint, this.firstPoint);
    } else {
      return; // Can't draw anything yet
    }

    const screenCenterPoint = worldToScreen(this.centerPoint);
    const screenRadius = radiusTemp * drawInfo.screenZoom;
    drawInfo.context.beginPath();
    drawInfo.context.arc(
      screenCenterPoint.x,
      screenCenterPoint.y,
      screenRadius,
      this.arc?.startAngle || 0,
      this.arc?.endAngle || 2 * Math.PI,
    );
    drawInfo.context.stroke();
  }

  public move(x: number, y: number) {
    if (this.arc) {
      this.arc = this.arc.translate(x, y);
    }
  }

  public clone(): Entity {
    if (this.arc) {
      const { center, r, startAngle, endAngle, counterClockwise } = this.arc;
      return new ArcEntity(
        center,
        r.valueOf(),
        startAngle,
        endAngle,
        counterClockwise,
      );
    }
    return this;
  }

  public intersectsWithBox(box: Box): boolean {
    if (!this.arc) {
      return false;
    }
    return this.arc.intersect(box).length > 0;
  }

  public isContainedInBox(box: Box): boolean {
    if (!this.arc) {
      return false;
    }
    return box.contains(this.arc);
  }

  public getBoundingBox(): Box | null {
    if (!this.arc) {
      return null;
    }
    return this.arc.box;
  }

  public getShape(): Shape | null {
    return this.arc;
  }

  public getSnapPoints(): SnapPoint[] {
    if (this.centerPoint === null || this.arc === null) {
      return [];
    }
    return [
      {
        point: this.centerPoint,
        type: SnapPointType.CircleCenter,
      },
      {
        point: this.arc.start,
        type: SnapPointType.LineEndPoint,
      },
      {
        point: this.arc.end,
        type: SnapPointType.LineEndPoint,
      },
      // TODO add cardinal points if they lay on the arc
      // TODO add tangent points from mouse location to circle
    ];
  }

  public getIntersections(entity: Entity): Point[] {
    const otherShape = entity.getShape();
    if (!this.arc || !otherShape) {
      return [];
    }
    return this.arc.intersect(otherShape);
  }

  public getFirstPoint(): Point | null {
    return this.centerPoint;
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    if (!this.arc) {
      return null;
    }
    return this.arc.distanceTo(shape);
  }

  public getSvgString(): string | null {
    if (!this.arc) {
      return null;
    }
    return (
      this.arc.svg({
        strokeWidth: this.lineWidth,
        stroke: getExportColor(this.lineColor),
      }) || null
    );
  }

  public getType(): EntityName {
    return EntityName.Arc;
  }

  public containsPointOnShape(point: Point): boolean {
    if (!this.arc) {
      return false;
    }
    return this.arc.contains(point);
  }

  public cutAtPoints(pointsOnShape: Point[]): ArcEntity[] {
    if (!this.arc) {
      return [this];
    }

    const points = uniqWith(
      [this.arc.start, this.arc.end, ...pointsOnShape],
      isPointEqual,
    );

    const sortedPoints = sortPointsOnArc(
      points,
      this.arc.center,
      this.arc.start,
    );

    const segmentArcs: ArcEntity[] = [];
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const point1 = sortedPoints[i];
      const point2 = sortedPoints[i + 1];

      const startAngle = ArcEntity.getAngle(this.arc.center, point1);
      const endAngle = ArcEntity.getAngle(this.arc.center, point2);

      const newArc = new ArcEntity(
        this.arc.center,
        Number(this.arc.r),
        startAngle,
        endAngle,
        this.arc.counterClockwise,
      );
      newArc.lineColor = this.lineColor;
      newArc.lineWidth = this.lineWidth;
      segmentArcs.push(newArc);
    }
    return segmentArcs;
  }

  public async toJson(): Promise<JsonEntity<ArcJsonData> | null> {
    if (!this.arc) {
      return null;
    }
    return {
      id: this.id,
      type: EntityName.Arc,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      shapeData: {
        center: { x: this.arc.center.x, y: this.arc.center.y },
        start: { x: this.arc.start.x, y: this.arc.start.y },
        end: { x: this.arc.end.x, y: this.arc.end.y },
        counterClockwise: this.arc.counterClockwise,
      },
    };
  }

  public static async fromJson(
    jsonEntity: JsonEntity<ArcJsonData>,
  ): Promise<ArcEntity> {
    if (jsonEntity.type !== EntityName.Arc) {
      throw new Error('Invalid Entity type in JSON');
    }

    const center = new Point(
      jsonEntity.shapeData.center.x,
      jsonEntity.shapeData.center.y,
    );
    const start = new Point(
      jsonEntity.shapeData.start.x,
      jsonEntity.shapeData.start.y,
    );
    const end = new Point(
      jsonEntity.shapeData.end.x,
      jsonEntity.shapeData.end.y,
    );
    const radius = Number(center.distanceTo(start)[0]);
    const startAngle = Number(ArcEntity.getAngle(center, start));
    const endAngle = Number(ArcEntity.getAngle(center, end));
    const counterClockwise = jsonEntity.shapeData.counterClockwise;

    const arcEntity = new ArcEntity(
      center,
      radius,
      startAngle,
      endAngle,
      counterClockwise,
    );
    arcEntity.id = jsonEntity.id;
    arcEntity.lineColor = jsonEntity.lineColor;
    arcEntity.lineWidth = jsonEntity.lineWidth;
    return arcEntity;
  }
}

export interface ArcJsonData {
  center: { x: number; y: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
  counterClockwise: boolean;
}
