import { Entity, EntityName, JsonEntity } from './Entity';
import { Shape, SnapPoint, SnapPointType } from '../App.types';
import * as Flatten from '@flatten-js/core';
import { Box, Point, Segment } from '@flatten-js/core';
import { getExportColor } from '../helpers/get-export-color';
import { scalePoint } from '../helpers/scale-point';
import { DrawController } from '../drawControllers/DrawController';

export class PointEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  public point: Point;

  constructor(pointOrX?: Point | number, y?: number) {
    if (pointOrX instanceof Point) {
      // Passed point
      this.point = new Point(pointOrX.x, pointOrX.y);
    } else {
      // Passed x and y coordinates
      this.point = new Point(pointOrX as number, y as number);
    }
  }

  public draw(drawController: DrawController): void {
    drawController.drawArc(this.point, 5, 0, Math.PI * 2);
  }

  public move(x: number, y: number) {
    this.point = this.point.translate(x, y);
  }

  public scale(scaleOrigin: Point, scaleFactor: number) {
    this.point = scalePoint(this.point, scaleOrigin, scaleFactor);
  }

  public rotate(rotateOrigin: Point, angle: number) {
    this.point = this.point.rotate(angle, rotateOrigin);
  }

  public clone(): PointEntity {
    return new PointEntity(this.point.clone());
  }

  public intersectsWithBox(): boolean {
    return false;
  }

  public isContainedInBox(box: Box): boolean {
    return box.contains(this.point);
  }

  public getBoundingBox(): Box | null {
    if (!this.point) {
      return null;
    }
    return new Box(this.point.x, this.point.y, this.point.x, this.point.y);
  }

  public getShape(): Shape | null {
    return this.point;
  }

  public getSnapPoints(): SnapPoint[] {
    return [
      {
        point: this.point,
        type: SnapPointType.Point,
      },
    ];
  }

  public getIntersections(): Point[] {
    return [];
  }

  public getFirstPoint(): Point | null {
    return this.point;
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    return this.point.distanceTo(shape);
  }

  public getSvgString(): string | null {
    return (
      this.point.svg({
        strokeWidth: this.lineWidth,
        stroke: getExportColor(this.lineColor),
      }) || null
    );
  }

  public getType(): EntityName {
    return EntityName.Point;
  }

  public containsPointOnShape(point: Flatten.Point): boolean {
    return this.point.equalTo(point);
  }

  public async toJson(): Promise<JsonEntity<PointJsonData> | null> {
    return {
      id: this.id,
      type: EntityName.Point,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      shapeData: {
        point: {
          x: this.point.x,
          y: this.point.y,
        },
      },
    };
  }

  public static async fromJson(
    jsonEntity: JsonEntity<PointJsonData>,
  ): Promise<PointEntity> {
    const point = new Point(
      jsonEntity.shapeData.point.x,
      jsonEntity.shapeData.point.y,
    );
    const lineEntity = new PointEntity(point);
    lineEntity.id = jsonEntity.id;
    lineEntity.lineColor = jsonEntity.lineColor;
    lineEntity.lineWidth = jsonEntity.lineWidth;
    return lineEntity;
  }
}

export interface PointJsonData {
  point: {
    x: number;
    y: number;
  };
}
