import { Entity } from './Entitity.ts';
import { DrawInfo, Shape } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';

export class LineEntity implements Entity {
  private segment: Segment | null = null;
  private startPoint: Point | null = null;
  public isSelected: boolean = false;
  public isHighlighted: boolean = false;

  constructor(p1?: Point, p2?: Point) {
    if (p1 && p2) {
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
      endPointTemp = new Point(drawInfo.mouse.x, drawInfo.mouse.y);
    }

    drawInfo.context.beginPath();
    drawInfo.context.moveTo(startPointTemp.x, startPointTemp.y);
    drawInfo.context.lineTo(endPointTemp.x, endPointTemp.y);
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
