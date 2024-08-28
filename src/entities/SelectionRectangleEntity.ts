import { Entity, EntityName, JsonEntity } from './Entity.ts';
import { DrawInfo, SnapPoint } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';
import {
  EPSILON,
  SELECTION_RECTANGLE_COLOR_CONTAINS,
  SELECTION_RECTANGLE_COLOR_INTERSECTION,
} from '../App.consts.ts';
import { worldToScreen } from '../helpers/world-screen-conversion.ts'; // TODO move the selection rectangle to its own thing, not part of the entities logic

// TODO move the selection rectangle to its own thing, not part of the entities logic
export class SelectionRectangleEntity implements Entity {
  public id: string = crypto.randomUUID();
  public lineColor: string = '#fff';
  public lineWidth: number = 1;

  private rectangle: Box | null = null;
  private startPoint: Point | null = null;

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
      endPointTemp = new Point(
        drawInfo.worldMouseLocation.x,
        drawInfo.worldMouseLocation.y,
      );
    }

    const selectionToTheLeft = startPointTemp.x > endPointTemp.x;

    const screenStartPoint = worldToScreen(startPointTemp);
    const screenEndPoint = worldToScreen(endPointTemp);

    drawInfo.context.setLineDash([5, 5]);
    drawInfo.context.strokeStyle = selectionToTheLeft
      ? SELECTION_RECTANGLE_COLOR_INTERSECTION
      : SELECTION_RECTANGLE_COLOR_CONTAINS;
    drawInfo.context.lineWidth = 1;

    drawInfo.context.beginPath();
    drawInfo.context.strokeRect(
      screenStartPoint.x,
      screenStartPoint.y,
      screenEndPoint.x - screenStartPoint.x,
      screenEndPoint.y - screenStartPoint.y,
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

  public getSnapPoints(): SnapPoint[] {
    return []; // Not implemented
  }

  public getIntersections(): Point[] {
    return []; // Not implemented
  }

  public getFirstPoint(): Point | null {
    return this.startPoint;
  }

  public distanceTo(): [number, Segment] | null {
    return null; // Not implemented
  }

  public getSvgString(): string | null {
    return null;
  }

  public getType(): EntityName {
    return EntityName.SelectionRectangle;
  }

  public containsPointOnShape(): boolean {
    return false; // Not implemented
  }

  public toJson(): JsonEntity | null {
    return null; // Not implemented
  }

  public fromJson(): Entity | null {
    return null; // Not implemented
  }
}
