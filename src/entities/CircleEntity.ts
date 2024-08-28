import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import { Box, circle, Circle, point, Point, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { ArcEntity } from './ArcEntity.ts';
import { wrapModule } from '../helpers/wrap-module.ts';
import { pointDistance } from '../helpers/distance-between-points.ts';

export class CircleEntity implements Entity {
  public id: string = crypto.randomUUID();
  private circle: Circle | null = null;
  private centerPoint: Point | null = null;

  constructor(centerPoint?: Point, radiusOrSecondPoint?: number | Point) {
    if (centerPoint) {
      this.centerPoint = centerPoint;
    }
    if (centerPoint && radiusOrSecondPoint) {
      this.circle = new Circle(
        centerPoint,
        typeof radiusOrSecondPoint === 'number'
          ? radiusOrSecondPoint
          : pointDistance(centerPoint, radiusOrSecondPoint),
      );
    }
  }

  public send(newPoint: Point): boolean {
    if (!this.centerPoint) {
      this.centerPoint = point(newPoint.x, newPoint.y);
      return false;
    } else if (!this.circle) {
      this.circle = circle(
        this.centerPoint,
        this.centerPoint.distanceTo(newPoint)[0],
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
    if (this.circle) {
      // Draw the circle with the center point and the radius
      radiusTemp = this.circle.r;
    } else {
      // Draw the circle with the center point and the distance between the center and the mouse as the radius
      radiusTemp = this.centerPoint.distanceTo(drawInfo.worldMouseLocation)[0];
    }

    const screenCenterPoint = worldToScreen(this.centerPoint);
    const screenRadius = radiusTemp * drawInfo.screenZoom;
    drawInfo.context.beginPath();
    drawInfo.context.arc(
      screenCenterPoint.x,
      screenCenterPoint.y,
      screenRadius,
      0,
      2 * Math.PI,
    );
    drawInfo.context.stroke();
  }

  public intersectsWithBox(box: Box): boolean {
    if (!this.circle) {
      return false;
    }
    return this.circle.intersect(box).length > 0;
  }

  public isContainedInBox(box: Box): boolean {
    if (!this.circle) {
      return false;
    }
    return box.contains(this.circle);
  }

  public getBoundingBox(): Box | null {
    if (!this.circle) {
      return null;
    }
    return this.circle.box;
  }

  public getShape(): Shape | null {
    return this.circle;
  }

  public getSnapPoints(): SnapPoint[] {
    if (this.centerPoint === null || this.circle === null) {
      return [];
    }
    return [
      {
        point: this.centerPoint,
        type: SnapPointType.CircleCenter,
      },
      {
        point: new Point(
          this.centerPoint.x + this.circle.r,
          this.centerPoint.y,
        ),
        type: SnapPointType.CircleCardinal,
      },
      {
        point: new Point(
          this.centerPoint.x - this.circle.r,
          this.centerPoint.y,
        ),
        type: SnapPointType.CircleCardinal,
      },
      {
        point: new Point(
          this.centerPoint.x,
          this.centerPoint.y + this.circle.r,
        ),
        type: SnapPointType.CircleCardinal,
      },
      {
        point: new Point(
          this.centerPoint.x,
          this.centerPoint.y - this.circle.r,
        ),
        type: SnapPointType.CircleCardinal,
      },
      // TODO add tangent points from mouse location to circle
    ];
  }

  public getIntersections(entity: Entity): Point[] {
    const otherShape = entity.getShape();
    if (!this.circle || !otherShape) {
      return [];
    }
    return this.circle.intersect(otherShape);
  }

  public getFirstPoint(): Point | null {
    return this.centerPoint;
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    if (!this.circle) {
      return null;
    }
    return this.circle.distanceTo(shape);
  }

  public getSvgString(): string | null {
    return this.circle?.svg() || null;
  }

  public getType(): EntityName {
    return EntityName.Circle;
  }

  public containsPointOnShape(point: Point): boolean {
    if (!this.circle) {
      return false;
    }
    return this.circle.contains(point);
  }

  public cutAtPoints(pointsOnShape: Point[]): Entity[] {
    if (!this.circle) {
      return [this];
    }
    const segmentArcs: Entity[] = [];

    // Go around the circle and also connect the last and first point with an arc
    const length = pointsOnShape.length;
    for (let i = 0; i < length; i++) {
      // Create points from using the 2 points from pointOnLine and the center point of the circle
      const point1 = pointsOnShape[wrapModule(i, length)];
      const point2 = pointsOnShape[wrapModule(i + 1, length)];

      const arc = new ArcEntity(
        this.centerPoint || undefined,
        point1,
        point2,
        true,
      );
      segmentArcs.push(arc);
    }
    return segmentArcs;
  }

  public toJson(): JsonEntity<CircleJsonData> | null {
    if (!this.circle) {
      return null;
    }
    return {
      id: this.id,
      type: EntityName.Circle,
      shapeData: {
        center: { x: this.circle.center.x, y: this.circle.center.y },
        radius: this.circle?.r,
      },
    };
  }

  public fromJson(jsonEntity: JsonEntity<CircleJsonData>): CircleEntity {
    const center = new Point(
      jsonEntity.shapeData.center.x,
      jsonEntity.shapeData.center.y,
    );
    const radius = jsonEntity.shapeData.radius;
    const circleEntity = new CircleEntity(center, radius);
    circleEntity.id = jsonEntity.id;
    return circleEntity;
  }
}

export interface CircleJsonData {
  center: { x: number; y: number };
  radius: number;
}
