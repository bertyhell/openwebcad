import { Entity } from './Entitity.ts';
import { DrawInfo, Shape, SnapPoint, SnapPointType } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';
import { worldToScreen } from '../helpers/world-screen-conversion.ts';

export class LineEntity implements Entity {
  public readonly id: string = crypto.randomUUID();
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

    const screenStartPoint = worldToScreen(
      startPointTemp,
      drawInfo.screenOffset,
      drawInfo.screenZoom,
    );
    const screenEndPoint = worldToScreen(
      endPointTemp,
      drawInfo.screenOffset,
      drawInfo.screenZoom,
    );

    drawInfo.context.beginPath();
    drawInfo.context.moveTo(screenStartPoint.x, screenStartPoint.y);
    drawInfo.context.lineTo(screenEndPoint.x, screenEndPoint.y);
    drawInfo.context.stroke();
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
    return this.segment?.svg() || null;
  }
}
