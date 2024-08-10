import { Entity } from './Entitity.ts';
import { DrawInfo, Shape, SnapPoint } from '../App.types.ts';
import { Box, Point, Relations, Segment } from '@flatten-js/core';

export class RectangleEntity implements Entity {
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

    drawInfo.context.beginPath();
    drawInfo.context.strokeRect(
      startPointTemp.x,
      startPointTemp.y,
      endPointTemp.x - startPointTemp.x,
      endPointTemp.y - startPointTemp.y,
    );
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
    return []; // TODO
  }

  public getFirstPoint(): Point | null {
    return this.startPoint;
  }

  public getSvgString(): string | null {
    const svgString = this.rectangle?.svg();

    // Patch for bug: https://github.com/alexbol99/flatten-js/pull/186/files
    return (
      svgString
        ?.replace(/width=([0-9]+)/g, 'width="$1"')
        ?.replace(/height=([0-9]+)/g, 'height="$1"') || null
    );
  }
}
