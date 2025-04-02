import {Entity, EntityName, JsonEntity} from './Entity';
import {Shape, SnapPoint, SnapPointType} from '../App.types';
import * as Flatten from '@flatten-js/core';
import {Box, Point, Polygon, Relations, Segment, Vector} from '@flatten-js/core';
import {getExportColor} from '../helpers/get-export-color';
import {scalePoint} from '../helpers/scale-point';
import {twoPointBoxToPolygon} from '../helpers/box-to-polygon';
import {polygonToSegments} from '../helpers/polygon-to-segments';
import {DrawController} from '../drawControllers/DrawController.ts';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {LineEntity} from './LineEntity.ts';
import {mirrorPointOverAxis} from "../helpers/mirror-point-over-axis.ts";
import {mirrorAngleOverAxis} from '../helpers/mirror-angle-over-axis.ts';

export class ImageEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineDash: number[] | undefined = undefined;
  public layerId: string;

  private imageElement: HTMLImageElement;
  private polygon: Polygon;
  private angle: number;

  constructor(
      layerId: string,
    imgData: HTMLImageElement,
    startPointOrPolygon?: Point | Polygon,
    endPointOrAngle?: Point | number,
    angle: number = 0,
  ) {
    this.layerId = layerId;
    this.imageElement = imgData;
    if (startPointOrPolygon instanceof Polygon) {
      this.polygon = startPointOrPolygon as Polygon;
    } else {
      this.polygon = twoPointBoxToPolygon(
        startPointOrPolygon as Point,
        endPointOrAngle as Point,
      );
    }
    if (endPointOrAngle instanceof Point) {
      this.angle = angle;
    } else {
      this.angle = endPointOrAngle as number;
    }
  }

  public draw(drawController: DrawController): void {
    drawController.setLineStyles(
      isEntityHighlighted(this),
      isEntitySelected(this),
      this.lineColor,
      this.lineWidth,
      this.lineDash,
    );
    polygonToSegments(this.polygon).forEach(edge => {
      drawController.drawLine(edge.start, edge.end);
    });

    const width = this.polygon.box.width;
    const height = this.polygon.box.height;

    // Draw image
    drawController.drawImage(
      this.imageElement,
      this.polygon.box.xmin,
      this.polygon.box.ymin,
      width,
      height,
      this.angle,
    );
  }

  public move(x: number, y: number) {
    this.polygon = this.polygon.translate(new Vector(x, y));
  }

  public scale(scaleOrigin: Point, scaleFactor: number) {
    const center = this.polygon.box.center;
    const newCenter = scalePoint(center, scaleOrigin, scaleFactor);
    this.polygon = this.polygon.translate(
      new Vector(newCenter.x - center.x, newCenter.y - center.y),
    );
  }

  public rotate(rotateOrigin: Point, angle: number) {
    this.polygon = this.polygon.rotate(angle, rotateOrigin);
    this.angle += angle; // Need to keep track of the angle for drawing the image
  }

  public mirror(mirrorAxis: LineEntity) {
    const mirroredVertices = this.polygon.vertices.map(p => mirrorPointOverAxis(p, mirrorAxis));
    const mirroredAngle = mirrorAngleOverAxis(this.angle, mirrorAxis);
    // TODO mirror image pixels
    // this.imageElement = new HTMLImageElement(
    //     this.imageElement.
    // )
    this.polygon = new Polygon(mirroredVertices);
    this.angle = mirroredAngle;
  }

  public clone(): ImageEntity {
    const clonedImage = document.createElement('img');
    clonedImage.src = this.imageElement.src;
    return new ImageEntity(
        getActiveLayerId(), clonedImage, this.polygon.clone());
  }

  // TODO add destroy method to cleanup this.imageElement.src

  public intersectsWithBox(selectionBox: Box): boolean {
    return Relations.relate(this.polygon, selectionBox).B2B.length > 0;
  }

  public isContainedInBox(selectionBox: Box): boolean {
    return selectionBox.contains(this.polygon);
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    const distanceInfos: [number, Segment][] = polygonToSegments(
      this.polygon,
    ).map(segment => segment.distanceTo(shape));
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

  public getBoundingBox(): Box {
    return this.polygon.box;
  }

  public getShape(): Shape | null {
    return this.polygon;
  }

  public getSnapPoints(): SnapPoint[] {
    const corners = this.polygon.vertices;
    const edges = polygonToSegments(this.polygon);
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
    return polygonToSegments(this.polygon).flatMap(segment => {
      return segment.intersect(otherShape);
    });
  }

  public getFirstPoint(): Point | null {
    return this.polygon?.vertices[0] || null;
  }

  public getSvgString(): string | null {
    return this.polygon.svg({
      strokeWidth: this.lineWidth,
      stroke: getExportColor(this.lineColor),
    });
  }

  public getType(): EntityName {
    return EntityName.Image;
  }

  public containsPointOnShape(point: Flatten.Point): boolean {
    return polygonToSegments(this.polygon).some(segment =>
      segment.contains(point),
    );
  }

  public async toJson(): Promise<JsonEntity<ImageJsonData> | null> {
    return {
      id: this.id,
      type: EntityName.Image,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      layerId: this.layerId,
      shapeData: {
        points: this.polygon.vertices.map(vertex => ({
          x: vertex.x,
          y: vertex.y,
        })),
        imageData: this.imageElement.currentSrc,
      },
    };
  }

  public static async fromJson(
    jsonEntity: JsonEntity<ImageJsonData>,
  ): Promise<ImageEntity> {
    const rectangle = new Polygon(
      jsonEntity.shapeData.points.map(point => new Point(point.x, point.y)),
    );
    const image = new Image();
    image.src = jsonEntity.shapeData.imageData;
    const rectangleEntity = new ImageEntity(
        jsonEntity.layerId || getActiveLayerId(), image, rectangle);
    rectangleEntity.id = jsonEntity.id;
    rectangleEntity.lineColor = jsonEntity.lineColor;
    rectangleEntity.lineWidth = jsonEntity.lineWidth;
    return rectangleEntity;
  }
}

export interface ImageJsonData {
  points: { x: number; y: number }[];
  imageData: string;
}
