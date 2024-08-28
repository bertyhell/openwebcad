import { DrawInfo, Shape, SnapPoint } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';
import { ArcJsonData } from './ArcEntity.ts';
import { CircleJsonData } from './CircleEntity.ts';
import { LineJsonData } from './LineEntity.ts';
import { RectangleJsonData } from './RectangleEntity.ts';
import { PointJsonData } from './PointEntity.ts';

export interface Entity {
  // Random uuid generated when the Entity is created
  // Used for comparing entities
  id: string;
  lineColor: string;
  lineWidth: number;
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
  containsPointOnShape(point: Point): boolean;
  toJson(): JsonEntity | null;
  fromJson(jsonEntity: JsonEntity): Entity | null;
}

export enum EntityName {
  Line = 'Line',
  Circle = 'Circle',
  Arc = 'Arc',
  Rectangle = 'Rectangle',
  SelectionRectangle = 'SelectionRectangle',
  Point = 'Point',
}

export type ShapeJsonData =
  | RectangleJsonData
  | CircleJsonData
  | ArcJsonData
  | LineJsonData
  | PointJsonData;

export interface JsonEntity<TShapeJsonData = ShapeJsonData> {
  id: string;
  type: EntityName;
  lineColor: string;
  lineWidth: number;
  shapeData: TShapeJsonData;
}
