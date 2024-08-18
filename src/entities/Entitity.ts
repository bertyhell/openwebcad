import { DrawInfo, Shape, SnapPoint } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';

export interface Entity {
  // Random uuid generated when the Entity is created
  // Used for comparing entities
  readonly id: string;
  draw(drawInfo: DrawInfo): void;
  getBoundingBox(): Box | null;
  intersectsWithBox(box: Box): boolean;
  isContainedInBox(box: Box): boolean;
  getFirstPoint(): Point | null;
  getShape(): Shape | null;
  getSnapPoints(): SnapPoint[];
  getIntersections(entity: Entity): Point[];
  distanceTo(shape: Shape): [number, Segment] | null;
  getSvgString(): string | null;
  getType(): EntityName;
  containsPoint(point: Point): boolean;
}

export enum EntityName {
  Line = 'Line',
  Circle = 'Circle',
  Rectangle = 'Rectangle',
  SelectionRectangle = 'SelectionRectangle',
  Point = 'Point',
}
