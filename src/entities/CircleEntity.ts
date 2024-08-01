import { Entity } from './Entitity.ts';
import { DrawInfo, Shape } from '../App.types.ts';
import { Box, circle, Circle, point, Point, Segment } from '@flatten-js/core';

export class CircleEntity implements Entity {
  private circle: Circle | null = null;
  private centerPoint: Point | null = null;
  public isSelected: boolean = false;
  public isHighlighted: boolean = false;

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
      radiusTemp = this.centerPoint.distanceTo(drawInfo.mouse)[0];
    }

    drawInfo.context.beginPath();
    drawInfo.context.arc(
      this.centerPoint.x,
      this.centerPoint.y,
      radiusTemp,
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
}
