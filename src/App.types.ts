import { Box, Circle, Point, Segment } from '@flatten-js/core';

export interface DrawInfo {
  context: CanvasRenderingContext2D;
  canvasSize: { x: number; y: number };
  mouse: Point;
}

export type Shape = Box | Segment | Point | Circle;

export enum SnapPointType {
    AngleGuide = 'AngleGuide',
    LineEndPoint = 'LineEndPoint',
    LineIntersection = 'LineIntersection',
    CircleCenter = 'CircleCenter',
    CircleCardinal = 'CircleCardinal',
    CircleTangent = 'CircleTangent',
    MiddlePoint = 'MiddlePoint'
}

export interface SnapPoint {
    point: Point;
    type: SnapPointType;
}

export type SnapPointConfig = Record<SnapPointType, boolean>;
