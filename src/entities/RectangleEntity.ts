import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import * as Flatten from '@flatten-js/core';
import { Box, Point, Relations, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { getExportColor } from '../helpers/get-export-color.ts';
import { scalePoint } from '../helpers/scale-point.ts';

export class RectangleEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  private rectangle: Box;

  constructor(startPointOrRectangle?: Point | Box, endPoint?: Point) {
    if (startPointOrRectangle instanceof Box) {
      this.rectangle = startPointOrRectangle as Box;
    } else {
      this.rectangle = new Box(
        Math.min((startPointOrRectangle as Point).x, (endPoint as Point).x),
        Math.min((startPointOrRectangle as Point).y, (endPoint as Point).y),
        Math.max((startPointOrRectangle as Point).x, (endPoint as Point).x),
        Math.max((startPointOrRectangle as Point).y, (endPoint as Point).y),
      );
    }
  }

  public draw(drawInfo: DrawInfo): void {
    const screenStartPoint = worldToScreen(this.rectangle.high);
    const screenEndPoint = worldToScreen(this.rectangle.low);

    drawInfo.context.beginPath();
    drawInfo.context.strokeRect(
      screenStartPoint.x,
      screenStartPoint.y,
      screenEndPoint.x - screenStartPoint.x,
      screenEndPoint.y - screenStartPoint.y,
    );
  }

  public move(x: number, y: number) {
    this.rectangle = this.rectangle.translate(x, y);
  }

  public scale(scaleOrigin: Point, scaleFactor: number) {
    const low = scalePoint(this.rectangle.low, scaleOrigin, scaleFactor);
    const high = scalePoint(this.rectangle.high, scaleOrigin, scaleFactor);
    this.rectangle = new Box(low.x, low.y, high.x, high.y);
  }

  public clone(): RectangleEntity | null {
    return new RectangleEntity(this.rectangle.clone());
  }

  public intersectsWithBox(selectionBox: Box): boolean {
    return Relations.relate(this.rectangle, selectionBox).B2B.length > 0;
  }

  public isContainedInBox(selectionBox: Box): boolean {
    return selectionBox.contains(this.rectangle);
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    const distanceInfos: [number, Segment][] = this.rectangle
      .toSegments()
      .map(segment => segment.distanceTo(shape));
    let shortestDistanceInfo: [number, Segment | null] = [
      Number.MAX_SAFE_INTEGER,
      null,
    ];
    distanceInfos.forEach(distanceInfo => {
      if (distanceInfo[0] < shortestDistanceInfo[0]) {
        shortestDistanceInfo = distanceInfo;
      }
    });
    return shortestDistanceInfo as [number, Segment];
  }

  public getBoundingBox(): Box | null {
    return this.rectangle;
  }

  public getShape(): Shape | null {
    return this.rectangle;
  }

  public getSnapPoints(): SnapPoint[] {
    const corners = this.rectangle.toPoints();
    const edges = this.rectangle.toSegments();
    return [
      {
        point: corners[0],
        type: SnapPointType.LineEndPoint,
      },
      {
        point: corners[1],
        type: SnapPointType.LineEndPoint,
      },
      {
        point: corners[2],
        type: SnapPointType.LineEndPoint,
      },
      {
        point: corners[3],
        type: SnapPointType.LineEndPoint,
      },
      {
        point: edges[0].middle(),
        type: SnapPointType.LineMidPoint,
      },
      {
        point: edges[1].middle(),
        type: SnapPointType.LineMidPoint,
      },
      {
        point: edges[2].middle(),
        type: SnapPointType.LineMidPoint,
      },
      {
        point: edges[3].middle(),
        type: SnapPointType.LineMidPoint,
      },
    ];
  }

  public getIntersections(entity: Entity): Point[] {
    const otherShape = entity.getShape();
    if (!otherShape) {
      return [];
    }
    return this.rectangle.toSegments().flatMap(segment => {
      return segment.intersect(otherShape);
    });
  }

  public getFirstPoint(): Point | null {
    return this.rectangle.low;
  }

  public getSvgString(): string | null {
    return this.rectangle.svg({
      strokeWidth: this.lineWidth,
      stroke: getExportColor(this.lineColor),
    });
  }

  public getType(): EntityName {
    return EntityName.Rectangle;
  }

  public containsPointOnShape(point: Flatten.Point): boolean {
    return this.rectangle.toSegments().some(segment => segment.contains(point));
  }

  public async toJson(): Promise<JsonEntity<RectangleJsonData> | null> {
    return {
      id: this.id,
      type: EntityName.Rectangle,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      shapeData: {
        xmin: this.rectangle.xmin,
        ymin: this.rectangle.ymin,
        xmax: this.rectangle.xmax,
        ymax: this.rectangle.ymax,
      },
    };
  }

  public static async fromJson(
    jsonEntity: JsonEntity<RectangleJsonData>,
  ): Promise<RectangleEntity> {
    const startPoint = new Point(
      jsonEntity.shapeData.xmin,
      jsonEntity.shapeData.ymin,
    );
    const endPoint = new Point(
      jsonEntity.shapeData.xmax,
      jsonEntity.shapeData.ymax,
    );
    const rectangleEntity = new RectangleEntity(startPoint, endPoint);
    rectangleEntity.id = jsonEntity.id;
    rectangleEntity.lineColor = jsonEntity.lineColor;
    rectangleEntity.lineWidth = jsonEntity.lineWidth;
    return rectangleEntity;
  }
}

export interface RectangleJsonData {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}
