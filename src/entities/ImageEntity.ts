import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import * as Flatten from '@flatten-js/core';
import { Box, Point, Relations, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { getExportColor } from '../helpers/get-export-color.ts';

export class ImageEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  private imageData: ArrayBuffer | null = null;
  private rectangle: Box | null = null;
  private startPoint: Point | null = null;

  constructor(imgData: ArrayBuffer, startPoint?: Point, endPoint?: Point) {
    this.imageData = imgData;
    if (startPoint && !endPoint) {
      this.startPoint = startPoint;
    } else if (startPoint && endPoint) {
      this.rectangle = new Box(
        Math.min(startPoint.x, endPoint.x),
        Math.min(startPoint.y, endPoint.y),
        Math.max(startPoint.x, endPoint.x),
        Math.max(startPoint.y, endPoint.y),
      );
    }
  }

  public draw(drawInfo: DrawInfo): void {
    if (!this.rectangle || !this.imageData) {
      return;
    }

    const startPointTemp: Point = this.rectangle.high;
    const endPointTemp: Point = this.rectangle.low;

    const screenStartPoint = worldToScreen(startPointTemp);
    const screenEndPoint = worldToScreen(endPointTemp);

    const width = Math.abs(screenEndPoint.x - screenStartPoint.x);
    const height = Math.abs(screenEndPoint.y - screenStartPoint.y);

    if (width === 0 || height === 0) {
      return;
    }

    drawInfo.context.beginPath();
    drawInfo.context.strokeRect(
      screenStartPoint.x,
      screenStartPoint.y,
      screenEndPoint.x - screenStartPoint.x,
      screenEndPoint.y - screenStartPoint.y,
    );

    const array = new Uint8ClampedArray(this.imageData);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        array[i] = x; // red
        array[i + 1] = y; // green
        array[i + 2] = 0; // blue
        array[i + 3] = 255; // alpha
      }
    }

    const imageData = new ImageData(array, width, height);
    drawInfo.context.putImageData(
      imageData,
      screenStartPoint.x,
      screenStartPoint.y,
    );
  }

  public move(x: number, y: number) {
    if (this.rectangle && this.imageData) {
      const newRectangle = this.rectangle.translate(x, y);
      return new ImageEntity(
        this.imageData,
        newRectangle.low,
        newRectangle.high,
      );
    }
    return this;
  }

  public intersectsWithBox(selectionBox: Box): boolean {
    if (!this.rectangle) {
      return false;
    }
    return Relations.relate(this.rectangle, selectionBox).B2B.length > 0;
  }

  public isContainedInBox(selectionBox: Box): boolean {
    if (!this.rectangle) {
      return false;
    }
    return selectionBox.contains(this.rectangle);
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    if (!this.rectangle) return null;
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
    if (!this.rectangle) {
      return null;
    }
    return this.rectangle;
  }

  public getShape(): Shape | null {
    return this.rectangle;
  }

  public getSnapPoints(): SnapPoint[] {
    if (!this.rectangle) {
      return [];
    }
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
    if (!this.rectangle || !otherShape) {
      return [];
    }
    return this.rectangle.toSegments().flatMap(segment => {
      return segment.intersect(otherShape);
    });
  }

  public getFirstPoint(): Point | null {
    return this.startPoint;
  }

  public getSvgString(): string | null {
    if (!this.rectangle) {
      return null;
    }
    return this.rectangle.svg({
      strokeWidth: this.lineWidth,
      stroke: getExportColor(this.lineColor),
    });
  }

  public getType(): EntityName {
    return EntityName.Image;
  }

  public containsPointOnShape(point: Flatten.Point): boolean {
    if (!this.rectangle) {
      return false;
    }
    return this.rectangle.toSegments().some(segment => segment.contains(point));
  }

  private async arrayBufferToBase64(arrayBuffer: ArrayBuffer): Promise<string> {
    return new Promise<string>(resolve => {
      const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(blob);
    });
  }

  private async base64StringToArrayBuffer(
    base64String: string,
  ): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>(resolve => {
      const byteString = atob(base64String.split(',')[1]);
      const byteStringLength = byteString.length;
      const arrayBuffer = new ArrayBuffer(byteStringLength);
      const uint8Array = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteStringLength; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      resolve(arrayBuffer);
    });
  }

  public async toJson(): Promise<JsonEntity<ImageJsonData> | null> {
    if (!this.rectangle || !this.imageData) {
      return null;
    }
    return {
      id: this.id,
      type: EntityName.Image,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      shapeData: {
        xmin: this.rectangle.xmin,
        ymin: this.rectangle.ymin,
        xmax: this.rectangle.xmax,
        ymax: this.rectangle.ymax,
        imageData: await this.arrayBufferToBase64(this.imageData),
      },
    };
  }

  public async fromJson(
    jsonEntity: JsonEntity<ImageJsonData>,
  ): Promise<ImageEntity> {
    const startPoint = new Point(
      jsonEntity.shapeData.xmin,
      jsonEntity.shapeData.ymin,
    );
    const endPoint = new Point(
      jsonEntity.shapeData.xmax,
      jsonEntity.shapeData.ymax,
    );
    const rectangleEntity = new ImageEntity(
      await this.base64StringToArrayBuffer(jsonEntity.shapeData.imageData),
      startPoint,
      endPoint,
    );
    rectangleEntity.id = jsonEntity.id;
    rectangleEntity.lineColor = jsonEntity.lineColor;
    rectangleEntity.lineWidth = jsonEntity.lineWidth;
    return rectangleEntity;
  }
}

export interface ImageJsonData {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  imageData: string;
}
