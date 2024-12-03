import { Point, Vector } from '@flatten-js/core';
import { CANVAS_INPUT_FIELD_FONT_SIZE } from '../App.consts.ts';

export interface DrawController {
  getCanvasSize(): Point;
  getScreenScale(): number;
  setScreenScale(newScreenScale: number): void;
  getScreenOffset(): Point;
  setScreenOffset(newScreenOffset: Point): void;

  worldToScreen(worldCoordinate: Point): Point;
  worldsToScreens(worldCoordinates: Point[]): Point[];
  screenToWorld(screenCoordinate: Point): Point;
  screensToWorlds(screenCoordinates: Point[]): Point[];

  setLineStyles(
    isHighlighted: boolean,
    isSelected: boolean,
    color: string,
    lineWidth: number,
    dash: number[],
  ): void;
  setFillStyles(fillColor: string): void;
  clear(): void;
  drawLine(startPoint: Point, endPoint: Point): void;
  drawArc(
    centerPoint: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void;
  drawText(
    label: string,
    basePoint: Point,
    options: Partial<{
      textDirection?: Vector;
      textAlign: 'left' | 'center' | 'right';
      textColor: string;
      fontSize: number;
      fontFamily: string;
    }>,
  ): void;
  drawImage(
    imageElement: HTMLImageElement,
    xMin: number,
    yMin: number,
    width: number,
    height: number,
    angle: number,
  ): void;
  fillPolygon(...points: Point[]): void;
}

export const DEFAULT_TEXT_OPTIONS = {
  textDirection: new Vector(1, 0),
  textAlign: 'center' as const,
  textColor: '#FFF',
  fontSize: CANVAS_INPUT_FIELD_FONT_SIZE,
  fontFamily: 'sans-serif',
};
