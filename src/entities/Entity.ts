import { Shape, SnapPoint } from '../App.types';
import { Box, Point, Segment } from '@flatten-js/core';
import { ArcJsonData } from './ArcEntity';
import { CircleJsonData } from './CircleEntity';
import { LineJsonData } from './LineEntity';
import { RectangleJsonData } from './RectangleEntity';
import { PointJsonData } from './PointEntity';
import { ImageJsonData } from './ImageEntity';
import { DrawController } from '../drawControllers/DrawController.ts';

export interface Entity {
  // Random uuid generated when the Entity is created
  // Used for comparing entities
  id: string;
  lineColor: string;
  lineWidth: number;
  lineStyle: number[] | undefined;
  draw(drawController: DrawController): void;

  /**
   * Translate an entity by x and y amount
   * @param x
   * @param y
   */
  move(x: number, y: number): void;
  scale(scaleOrigin: Point, scaleFactor: number): void;
  rotate(rotateOrigin: Point, angle: number): void;
  clone(): Entity;
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
  Measurement = 'Measurement',
}

export type ShapeJsonData =
  | RectangleJsonData
  | CircleJsonData
  | ArcJsonData
  | LineJsonData
  | PointJsonData
  | ImageJsonData;

export interface JsonEntity<TShapeJsonData = ShapeJsonData> {
  id: string;
  type: EntityName;
  lineColor: string;
  lineWidth: number;
  shapeData: TShapeJsonData;
}
