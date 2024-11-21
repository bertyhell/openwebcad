import { Entity, EntityName, JsonEntity } from './Entity';
import { Shape, SnapPoint, SnapPointType } from '../App.types';
import { Arc, Box, Line, Point, Segment } from '@flatten-js/core';
import { uniqWith } from 'es-toolkit';
import { isPointEqual } from '../helpers/is-point-equal';
import { sortPointsOnArc } from '../helpers/sort-points-on-arc';
import { getExportColor } from '../helpers/get-export-color';
import { scalePoint } from '../helpers/scale-point';
import { DrawController } from '../drawControllers/DrawController.ts';

export class ArcEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  private arc: Arc;

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
    this.arc = new Arc(
      centerPoint,
      radius,
      startAngle,
      endAngle,
      counterClockwise,
    );
  }

  public draw(drawController: DrawController): void {
    drawController.drawArc(
      this.arc.center,
      this.arc.r.valueOf(),
      this.arc?.startAngle || 0,
      this.arc?.endAngle || 2 * Math.PI,
    );
  }

  public move(x: number, y: number) {
    this.arc = this.arc.translate(x, y);
  }

  public scale(scaleOrigin: Point, scaleFactor: number) {
    const center = scalePoint(this.arc.center, scaleOrigin, scaleFactor);
    this.arc = new Arc(
      center,
      this.arc.r.valueOf() * scaleFactor,
      this.arc.startAngle,
      this.arc.endAngle,
      this.arc.counterClockwise,
    );
  }

  public rotate(rotateOrigin: Point, angle: number) {
    this.arc = this.arc.rotate(angle, rotateOrigin);
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
    return this.arc.intersect(box).length > 0;
  }

  public isContainedInBox(box: Box): boolean {
    return box.contains(this.arc);
  }

  public getBoundingBox(): Box | null {
    return this.arc.box;
  }

  public getShape(): Shape | null {
    return this.arc;
  }

  public getSnapPoints(): SnapPoint[] {
    return [
      {
        point: this.arc.center,
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
    if (!otherShape) {
      return [];
    }
    return this.arc.intersect(otherShape);
  }

  public getFirstPoint(): Point | null {
    return this.arc.center;
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    return this.arc.distanceTo(shape);
  }

  public getSvgString(): string | null {
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
