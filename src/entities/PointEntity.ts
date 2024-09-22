import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import * as Flatten from '@flatten-js/core';
import { Box, Point, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { isNil } from 'es-toolkit';
import { getExportColor } from '../helpers/get-export-color.ts';

export class PointEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  public point: Point | null = null;

  constructor(x?: Point | number, y?: number) {
    if (!isNil(x) && !isNil(y)) {
      // Passed x and y coordinates
      this.point = new Point(x as number, y as number);
    }
  }

  public draw(drawInfo: DrawInfo): void {
    if (!this.point) {
      return;
    }
    const screenPoint = worldToScreen(this.point);

    drawInfo.context.beginPath();
    drawInfo.context.arc(screenPoint.x, screenPoint.y, 5, 0, Math.PI * 2);
    drawInfo.context.stroke();
  }

  public move(x: number, y: number) {
    if (this.point) {
      return new PointEntity(this.point.translate(x, y));
    }
    return this;
  }

  public intersectsWithBox(): boolean {
    return false;
  }

  public isContainedInBox(box: Box): boolean {
    if (!this.point) {
      return false;
    }
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
    if (!this.point) {
      return [];
    }
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
    if (!this.point) {
      return null;
    }
    return this.point.distanceTo(shape);
  }

  public getSvgString(): string | null {
    if (!this.point) {
      return null;
    }
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
    if (!this.point) {
      return false;
    }
    return this.point.equalTo(point);
  }

  public toJson(): JsonEntity<PointJsonData> | null {
    if (!this.point) {
      return null;
    }
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

  public fromJson(jsonEntity: JsonEntity<PointJsonData>): PointEntity {
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
