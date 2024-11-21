import { Entity, EntityName, JsonEntity } from './Entity';
import { Shape, SnapPoint, SnapPointType } from '../App.types';
import { Box, Point, Segment } from '@flatten-js/core';
import { sortBy, uniqWith } from 'es-toolkit';
import { isPointEqual } from '../helpers/is-point-equal';
import { pointDistance } from '../helpers/distance-between-points';
import { getExportColor } from '../helpers/get-export-color';
import { scalePoint } from '../helpers/scale-point';
import { DrawController } from '../drawControllers/DrawController';

export class LineEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;
  public lineStyle: number[] | undefined = undefined;

  private segment: Segment;

  constructor(p1?: Point | Segment, p2?: Point) {
    if (p1 instanceof Segment) {
      this.segment = p1;
    } else {
      this.segment = new Segment(p1, p2);
    }
  }

  public draw(drawController: DrawController): void {
    const startPoint = new Point(this.segment.start.x, this.segment.start.y);
    const endPoint = new Point(this.segment.end.x, this.segment.end.y);
    drawController.drawLine(startPoint, endPoint);
  }

  public move(x: number, y: number) {
    this.segment = this.segment.translate(x, y);
  }

  public scale(scaleOrigin: Point, scaleFactor: number) {
    const newStart = scalePoint(this.segment.start, scaleOrigin, scaleFactor);
    const newEnd = scalePoint(this.segment.end, scaleOrigin, scaleFactor);
    this.segment = new Segment(newStart, newEnd);
  }

  public rotate(rotateOrigin: Point, angle: number) {
    this.segment = this.segment.rotate(angle, rotateOrigin);
  }

  public clone(): LineEntity {
    return new LineEntity(this.segment.clone());
  }

  public intersectsWithBox(box: Box): boolean {
    return this.segment.intersect(box).length > 0;
  }

  public isContainedInBox(box: Box): boolean {
    return box.contains(this.segment);
  }

  public getBoundingBox(): Box | null {
    return this.segment.box;
  }

  public getShape(): Shape | null {
    return this.segment;
  }

  public getSnapPoints(): SnapPoint[] {
    return [
      {
        point: this.segment.start,
        type: SnapPointType.LineEndPoint,
      },
      {
        point: this.segment.end,
        type: SnapPointType.LineEndPoint,
      },
      {
        point: this.segment.middle(),
        type: SnapPointType.LineMidPoint,
      },
    ];
  }

  public getIntersections(entity: Entity): Point[] {
    const otherShape = entity.getShape();
    if (!otherShape) {
      return [];
    }
    return this.segment.intersect(otherShape);
  }

  public getFirstPoint(): Point | null {
    return this.segment.start;
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    return this.segment.distanceTo(shape);
  }

  public getSvgString(): string | null {
    return (
      this.segment.svg({
        strokeWidth: this.lineWidth,
        stroke: getExportColor(this.lineColor),
      }) || null
    );
  }

  public getType(): EntityName {
    return EntityName.Line;
  }

  public containsPointOnShape(point: Point): boolean {
    return this.segment.contains(point);
  }

  /**
   * Cuts the line at the given points and returns a list of new lines in order from the start point of the original line
   * @param pointsOnShape
   */
  public cutAtPoints(pointsOnShape: Point[]): Entity[] {
    const points = uniqWith(
      [this.segment.start, this.segment.end, ...pointsOnShape],
      isPointEqual,
    );
    const sortLinesByDistanceToStartPoint = sortBy(points, [
      (point: Point): number => pointDistance(this.segment!.start, point),
    ]);

    // Convert the points back into line segments
    const lineSegments: Entity[] = [];
    // Until length - 2, so we can combine start points with endpoints
    for (let i = 0; i < sortLinesByDistanceToStartPoint.length - 1; i++) {
      lineSegments.push(
        new LineEntity(
          sortLinesByDistanceToStartPoint[i],
          sortLinesByDistanceToStartPoint[i + 1],
        ),
      );
    }
    return lineSegments;
  }

  public async toJson(): Promise<JsonEntity<LineJsonData> | null> {
    return {
      id: this.id,
      type: EntityName.Line,
      lineColor: this.lineColor,
      lineWidth: this.lineWidth,
      shapeData: {
        startPoint: { x: this.segment.start.x, y: this.segment.start.y },
        endPoint: { x: this.segment.end.x, y: this.segment.end.y },
      },
    };
  }

  public static async fromJson(
    jsonEntity: JsonEntity<LineJsonData>,
  ): Promise<LineEntity> {
    const startPoint = new Point(
      jsonEntity.shapeData.startPoint.x,
      jsonEntity.shapeData.startPoint.y,
    );
    const endPoint = new Point(
      jsonEntity.shapeData.endPoint.x,
      jsonEntity.shapeData.endPoint.y,
    );
    const lineEntity = new LineEntity(startPoint, endPoint);
    lineEntity.id = jsonEntity.id;
    lineEntity.lineColor = jsonEntity.lineColor;
    lineEntity.lineWidth = jsonEntity.lineWidth;
    return lineEntity;
  }
}

export interface LineJsonData {
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}
