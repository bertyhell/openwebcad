import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import { Arc, Box, Line, point, Point, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { pointDistance } from '../helpers/distance-between-points.ts';
import { uniqWith } from 'es-toolkit';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import { sortPointsOnArc } from '../helpers/sort-points-on-arc.ts';

export class ArcEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;

  private arc: Arc | null = null;
  private centerPoint: Point | null = null;
  private firstPoint: Point | null = null;

  public static getAngle(centerPoint: Point, pointOnArc: Point): number {
    return new Line(centerPoint, pointOnArc).slope;
  }

  constructor(
    centerPoint?: Point,
    firstPoint?: Point,
    secondPoint?: Point,
    counterClockWise?: boolean,
  ) {
    if (centerPoint) {
      this.centerPoint = centerPoint;
    }
    if (centerPoint && firstPoint) {
      this.firstPoint = firstPoint;
    }
    if (centerPoint && firstPoint && secondPoint) {
      const startAngle = ArcEntity.getAngle(centerPoint, firstPoint);
      const endAngle = ArcEntity.getAngle(centerPoint, secondPoint);
      this.arc = new Arc(
        centerPoint,
        pointDistance(centerPoint, firstPoint),
        startAngle,
        endAngle,
        counterClockWise,
      );
    }
  }

  public send(newPoint: Point): boolean {
    if (!this.centerPoint) {
      this.centerPoint = point(newPoint.x, newPoint.y);
      return false;
    } else if (!this.firstPoint) {
      this.firstPoint = new Point(newPoint.x, newPoint.y);
    } else if (!this.arc) {
      const startAngle = ArcEntity.getAngle(this.centerPoint, this.firstPoint);
      const endAngle = ArcEntity.getAngle(this.centerPoint, newPoint);
      this.arc = new Arc(
        this.centerPoint,
        pointDistance(this.centerPoint, this.firstPoint),
        startAngle,
        endAngle,
        endAngle > startAngle,
      );
      return true;
    }
    return true;
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
    return this.arc?.svg() || null;
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

  public cutAtPoints(pointsOnShape: Point[]): Entity[] {
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

    const segmentArcs: Entity[] = [];
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      // Create points from using the 2 points from pointOnLine and the center point of the circle
      const point1 = sortedPoints[i];
      const point2 = sortedPoints[i + 1];

      const arc = new ArcEntity(
        this.centerPoint || undefined,
        point1,
        point2,
        this.arc.counterClockwise,
      );
      segmentArcs.push(arc);
    }
    return segmentArcs;
  }

  public toJson(): JsonEntity<ArcJsonData> | null {
    if (!this.arc) {
      return null;
    }
    return {
      id: this.id,
      type: EntityName.Arc,
      shapeData: {
        center: { x: this.arc.center.x, y: this.arc.center.y },
        start: { x: this.arc.start.x, y: this.arc.start.y },
        end: { x: this.arc.end.x, y: this.arc.end.y },
        counterClockwise: this.arc.counterClockwise,
      },
    };
  }

  public fromJson(jsonEntity: JsonEntity<ArcJsonData>): ArcEntity {
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
    const counterClockwise = jsonEntity.shapeData.counterClockwise;
    const arcEntity = new ArcEntity(center, start, end, counterClockwise);
    arcEntity.id = jsonEntity.id;
    return arcEntity;
  }
}

export interface ArcJsonData {
  center: { x: number; y: number };
  start: { x: number; y: number };
  end: { x: number; y: number };
  counterClockwise: boolean;
}
