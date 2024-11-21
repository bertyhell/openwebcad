import { Arc, Circle, Point, Polygon, Segment } from '@flatten-js/core';

export type Shape = Polygon | Segment | Point | Circle | Arc;

export enum SnapPointType {
  AngleGuide = 'AngleGuide',
  LineEndPoint = 'LineEndPoint',
  Intersection = 'Intersection',
  CircleCenter = 'CircleCenter',
  CircleCardinal = 'CircleCardinal',
  CircleTangent = 'CircleTangent',
  LineMidPoint = 'LineMidPoint',
  Point = 'Point',
}

export interface SnapPoint {
  point: Point;
  type: SnapPointType;
}

export type SnapPointConfig = Record<SnapPointType, boolean>;

export interface HoverPoint {
  snapPoint: SnapPoint;
  milliSecondsHovered: number;
}

export enum MouseButton {
  Left = 0, // Main button pressed, usually the left button or the un-initialized state
  Middle = 1, // Auxiliary button pressed, usually the wheel button or the middle button (if present)
  Right = 2, // Secondary button pressed, usually the right button
  Back = 3, // Fourth button, typically the Browser Back button
  Forward = 4, // Fifth button, typically the Browser Forward button
}

export enum HtmlEvent {
  UPDATE_STATE = 'UPDATE_STATE',
}

export interface StateMetaData {
  instructions: string;
}
