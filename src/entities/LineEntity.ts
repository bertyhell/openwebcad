import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';
import { sortBy, uniqWith } from 'es-toolkit';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import { pointDistance } from '../helpers/distance-between-points.ts';

export class LineEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;

  private segment: Segment | null = null;
  private startPoint: Point | null = null;

  constructor(p1?: Point | Segment, p2?: Point) {
    if (p1 instanceof Segment) {
      this.startPoint = p1.start;
      this.segment = p1;
    } else if (p1 && p2) {
      this.startPoint = p1;
      this.segment = new Segment(p1, p2);
    } else if (p1) {
      this.startPoint = p1;
    }
  }

  public send(point: Point): boolean {
    if (!this.startPoint) {
      this.startPoint = point;
      return false;
    } else if (!this.segment) {
      this.segment = new Segment(this.startPoint, point);
      return true;
    }
    return true;
  }

  public draw(drawInfo: DrawInfo): void {
    if (!this.startPoint) {
      return;
    }

    let startPointTemp: Point;
    let endPointTemp: Point;
    if (this.segment) {
      // Draw the line between the 2 points
      startPointTemp = this.segment.start;
      endPointTemp = this.segment.end;
    } else {
      // Draw the line between the start point and the mouse
      startPointTemp = this.startPoint;
      endPointTemp = new Point(
        drawInfo.worldMouseLocation.x,
        drawInfo.worldMouseLocation.y,
      );
    }

    const screenStartPoint = worldToScreen(startPointTemp);
    const screenEndPoint = worldToScreen(endPointTemp);

    drawInfo.context.beginPath();
    drawInfo.context.moveTo(screenStartPoint.x, screenStartPoint.y);
    drawInfo.context.lineTo(screenEndPoint.x, screenEndPoint.y);
    drawInfo.context.stroke();
  }

  public move(x: number, y: number) {
    if (this.segment) {
      return new LineEntity(this.segment.translate(x, y));
    }
    return this;
  }

  public intersectsWithBox(box: Box): boolean {
    if (!this.segment) {
      return false;
    }
    return this.segment.intersect(box).length > 0;
  }

  public isContainedInBox(box: Box): boolean {
    if (!this.segment) {
      return false;
    }
    return box.contains(this.segment);
  }

  public getBoundingBox(): Box | null {
    if (!this.segment) {
      return null;
    }
    return this.segment.box;
  }

  public getShape(): Shape | null {
    return this.segment;
  }

  public getSnapPoints(): SnapPoint[] {
    if (!this.segment?.start || !this.segment?.end) {
      return [];
    }
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
    if (!this.segment || !otherShape) {
      return [];
    }
    return this.segment.intersect(otherShape);
  }

  public getFirstPoint(): Point | null {
    return this.startPoint;
  }

  public distanceTo(shape: Shape): [number, Segment] | null {
    if (!this.segment) return null;
    return this.segment.distanceTo(shape);
  }

  public getSvgString(): string | null {
    if (!this.segment) {
      return null;
    }
    return (
      this.segment.svg({
        strokeWidth: this.lineWidth,
        stroke: this.lineColor,
      }) || null
    );
  }

  public getType(): EntityName {
    return EntityName.Line;
  }

  public containsPointOnShape(point: Point): boolean {
    if (!this.segment) {
      return false;
    }
    return this.segment.contains(point);
  }

  /**
   * Cuts the line at the given points and returns a list of new lines in order from the start point of the original line
   * @param pointsOnShape
   */
  public cutAtPoints(pointsOnShape: Point[]): Entity[] {
    if (!this.segment) {
      // This entity is not complete, so we cannot cut it yet
      return [this];
    }
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

  public toJson(): JsonEntity<LineJsonData> | null {
    if (!this.segment) {
      return null;
    }
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

  public fromJson(jsonEntity: JsonEntity<LineJsonData>): LineEntity {
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
