import { Point, Vector } from '@flatten-js/core';

export interface DrawController {
  setLineStyles(
    isHighlighted: boolean,
    isSelected: boolean,
    color: string,
    lineWidth: number,
    dash: number[],
  ): void;
  clearCanvas(): void;
  drawLine(startPoint: Point, endPoint: Point): void;
  drawArc(
    centerPoint: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
  ): void;
  drawArrowHead(startPoint: Point, endPoint: Point): void;
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
}
