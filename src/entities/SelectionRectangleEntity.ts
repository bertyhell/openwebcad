import { Entity } from './Entitity.ts';
import { DrawInfo } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';
import { EPSILON } from '../App.consts.ts';

export class SelectionRectangleEntity implements Entity {
  private rectangle: Box | null = null;
  private startPoint: Point | null = null;
  public isSelected: boolean = false;
  public isHighlighted: boolean = false;

  public send(point: Point): boolean {
    if (!this.startPoint) {
      this.startPoint = point;
      return false;
    } else if (!this.rectangle) {
      this.rectangle = new Box(
        Math.min(this.startPoint.x, point.x),
        Math.min(this.startPoint.y, point.y),
        Math.max(this.startPoint.x, point.x),
        Math.max(this.startPoint.y, point.y),
      );
      return true;
    }
    return true;
  }

  public draw(drawInfo: DrawInfo): void {
    if (!this.startPoint && !this.rectangle) {
      return;
    }

    let startPointTemp: Point;
    let endPointTemp: Point;
    if (this.rectangle) {
      // Draw the line between the 2 points
      startPointTemp = this.rectangle.high;
      endPointTemp = this.rectangle.low;
    } else {
      // Draw the line between the start point and the mouse
      startPointTemp = this.startPoint as Point;
      endPointTemp = new Point(drawInfo.mouse.x, drawInfo.mouse.y);
    }

    const selectionToTheLeft = startPointTemp.x > endPointTemp.x;

    drawInfo.context.setLineDash([5, 5]);
    drawInfo.context.strokeStyle = selectionToTheLeft ? '#b6ff9a' : '#6899f3';
    drawInfo.context.lineWidth = 1;

    drawInfo.context.beginPath();
    drawInfo.context.strokeRect(
      startPointTemp.x,
      startPointTemp.y,
      endPointTemp.x - startPointTemp.x,
      endPointTemp.y - startPointTemp.y,
    );
  }

  /**
   * Selections to the left of the start point are intersection selections (green), and everything intersecting with the selection rectangle will be selected
   * SElections to the right of the start point are normal selections (blue), and only the entities fully inside the selection rectangle will be selected
   */
  public isIntersectionSelection(): boolean {
    if (!this.rectangle || !this.startPoint) {
      return false;
    }
    return Math.abs(this.startPoint.x - this.rectangle?.xmin) > EPSILON;
  }

  public intersectsWithBox(box: Box): boolean {
    if (!this.rectangle) {
      return false;
    }
    return this.rectangle.intersect(box);
  }

  public isContainedInBox(box: Box): boolean {
    if (!this.rectangle) {
      return false;
    }
    return box.contains(this.rectangle);
  }

  public getBoundingBox(): Box | null {
    if (!this.rectangle) {
      return null;
    }
    return this.rectangle;
  }

  public getShape(): Box | null {
    return this.rectangle;
  }

  public getFirstPoint(): Point | null {
    return this.startPoint;
  }

  public distanceTo(): [number, Segment] | null {
    return null; // Not implemented
  }

  public getSvgString(): string | null {
    return this.rectangle?.svg() || null;
  }
}
