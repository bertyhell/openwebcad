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
  lineStyle: number[] | undefined;
  draw(drawInfo: DrawInfo): void;

  /**
   * Translate an entity by x and y amount
   * @param x
   * @param y
   */
  move(x: number, y: number): void;
  clone(): Entity | null;
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
  toJson(): Promise<JsonEntity | null>;
  // static fromJson(jsonEntity: JsonEntity): Promise<Entity | null>;
}

export enum EntityName {
  Line = 'Line',
  Circle = 'Circle',
  Arc = 'Arc',
  Rectangle = 'Rectangle',
  Point = 'Point',
  Image = 'Image',
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
