import { Point } from '@flatten-js/core';
import { DEFAULT_TEXT_OPTIONS, DrawController } from './DrawController';
import { SVG_MARGIN } from '../App.consts.ts';
import { TextOptions } from '../entities/TextEntity.ts';
import { triggerReactUpdate } from '../state.ts';
import { StateVariable } from '../helpers/undo-stack.ts';

export class SvgDrawController implements DrawController {
  private lineColor = '#000';
  private lineWidth = 1;
  private lineDash: number[] = [];
  private svgStrings: string[] = [];
  private fillColor: string = '#000';
  private screenScale = 1;
  private screenOffset = new Point(0, 0);

  constructor(
    private boundingBoxMinX: number,
    private boundingBoxMinY: number,
    private boundingBoxMaxX: number,
    private boundingBoxMaxY: number,
  ) {}

  getCanvasSize(): Point {
    return new Point(
      this.boundingBoxMaxX - this.boundingBoxMinX,
      this.boundingBoxMaxY - this.boundingBoxMinY,
    );
  }

  public getScreenScale() {
    return this.screenScale;
  }

  public setScreenScale(newScreenScale: number) {
    this.screenScale = newScreenScale;
    triggerReactUpdate(StateVariable.screenZoom);
  }

  public getScreenOffset() {
    return this.screenOffset;
  }

  public setScreenOffset(newScreenOffset: Point) {
    this.screenOffset = newScreenOffset;
    triggerReactUpdate(StateVariable.screenOffset);
  }

  /**
   * Convert coordinates from World Space --> Screen Space
   */
  public worldToScreen(worldCoordinate: Point): Point {
    return new Point(
      (worldCoordinate.x - this.screenOffset.x) * this.screenScale,
      (worldCoordinate.y - this.screenOffset.y) * this.screenScale +
        this.getCanvasSize().y,
    );
  }

  public worldsToScreens(worldCoordinates: Point[]): Point[] {
    return worldCoordinates.map(this.worldToScreen.bind(this));
  }

  /**
   * Convert coordinates from Screen Space --> World Space
   * (0, 0)       (1920, 0)
   *
   * (0, 1080)    (1920, 1080)
   *
   * convert to
   *
   * (0, 1080)    (1920, 1080)
   *
   * (0, 0)       (1920, 0)
   */
  public screenToWorld(screenCoordinate: Point): Point {
    return new Point(
      screenCoordinate.x / this.screenScale + this.screenOffset.x,
      this.getCanvasSize().y -
        screenCoordinate.y / this.screenScale +
        this.screenOffset.y,
    );
  }

  public screensToWorlds(screenCoordinates: Point[]): Point[] {
    return screenCoordinates.map(this.screenToWorld.bind(this));
  }

  public clear() {
    this.svgStrings = [];
  }

  public setLineStyles(
    _isHighlighted: boolean,
    _isSelected: boolean,
    color: string,
    lineWidth: number,
    dash: number[] = [],
  ) {
    this.lineColor = color;
    this.lineWidth = lineWidth;
    this.lineDash = dash;
  }

  public setFillStyles(fillColor: string) {
    this.fillColor = fillColor;
  }

  public export() {
    console.log('exporting svg', this.svgStrings);
    const boundingBoxWidth =
      this.boundingBoxMaxX - this.boundingBoxMinX + SVG_MARGIN * 2;
    const boundingBoxHeight =
      this.boundingBoxMaxY - this.boundingBoxMinY + SVG_MARGIN * 2;

    const svgString = `
      <svg width="${boundingBoxWidth}" height="${boundingBoxHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${boundingBoxWidth}" height="${boundingBoxHeight}" fill="white" />
        ${this.svgStrings.join('')}
      </svg>
    `;

    return {
      svgString,
      width: boundingBoxWidth,
      height: boundingBoxHeight,
    };
  }

  public drawLine(startPoint: Point, endPoint: Point): void {
    this.svgStrings.push(
      `<line x1="${startPoint.x}" y1="${startPoint.y}" x2="${endPoint.x}" y2="${endPoint.y}" stroke="${this.lineColor}" stroke-width="${this.lineWidth}" stroke-dasharray="${JSON.stringify(this.lineDash)}" />`,
    );
  }

  public drawArc(
    centerPoint: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
  ) {
    const startX = centerPoint.x + radius * Math.cos(startAngle);
    const startY = centerPoint.y + radius * Math.sin(startAngle);
    const endX = centerPoint.x + radius * Math.cos(endAngle);
    const endY = centerPoint.y + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

    this.svgStrings.push(
      `<path d="M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}" stroke="${this.lineColor}" stroke-width="${this.lineWidth}" fill="none" />`,
    );
  }

  public drawText(
    label: string,
    basePoint: Point,
    options?: Partial<TextOptions>,
  ): void {
    const textOptions = {
      ...DEFAULT_TEXT_OPTIONS,
      ...options,
    };

    this.svgStrings.push(
      `<text x="${basePoint.x}" y="${basePoint.y}" fill="${textOptions.textColor}" font-size="${textOptions.fontSize}" font-family="${textOptions.fontFamily}">${label}</text>`,
    );
  }

  public drawImage(
    imageElement: HTMLImageElement,
    xMin: number,
    yMin: number,
    width: number,
    height: number,
    angle: number,
  ): void {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Failed to create canvas context');
      return;
    }

    ctx.drawImage(imageElement, 0, 0);
    const dataUri = canvas.toDataURL(); // Convert the image to Base64

    const transform = angle
      ? `transform="rotate(${angle}, ${xMin + width / 2}, ${yMin + height / 2})"`
      : '';

    // noinspection HtmlUnknownAttribute
    this.svgStrings.push(
      `<image href="${dataUri}" x="${xMin}" y="${yMin}" width="${width}" height="${height}" ${transform} />`,
    );
  }

  public fillPolygon(...points: Point[]) {
    if (points.length < 3) return; // Polygon needs at least 3 points
    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
    this.svgStrings.push(
      `<polygon points="${pointsString}" fill="${this.fillColor}" />`,
    );
  }
}
