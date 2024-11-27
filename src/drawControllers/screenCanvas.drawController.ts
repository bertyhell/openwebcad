import {
  ARROW_HEAD_LENGTH,
  ARROW_HEAD_WIDTH,
  CANVAS_BACKGROUND_COLOR,
  CANVAS_INPUT_FIELD_FONT_SIZE,
  MOUSE_ZOOM_MULTIPLIER,
  TO_RADIANS,
} from '../App.consts';
import { Point, Vector } from '@flatten-js/core';
import { DrawController } from './DrawController';
import { triggerReactUpdate } from '../state.ts';
import { StateVariable } from '../helpers/undo-stack.ts';

export class ScreenCanvasDrawController implements DrawController {
  private screenOffset: Point = new Point(0, 0);
  private screenScale: number = 1;
  private screenMouseLocation: Point;

  constructor(
    private context: CanvasRenderingContext2D,
    private canvasSize: { x: number; y: number },
  ) {
    this.screenMouseLocation = new Point(canvasSize.x / 2, canvasSize.y / 2);
    this.setScreenOffset(new Point(0, -canvasSize.y)); // User expects mathematical coordinates, where y axis goes up, but canvas y axis goes down
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

  public getScreenMouseLocation(): Point {
    return this.screenMouseLocation;
  }

  public setScreenMouseLocation(newScreenMouseLocation: Point): void {
    this.screenMouseLocation = newScreenMouseLocation;
    triggerReactUpdate(StateVariable.screenMouseLocation);
  }

  public getWorldMouseLocation(): Point {
    return this.screenToWorld(this.screenMouseLocation);
  }

  public panScreen(screenOffsetX: number, screenOffsetY: number) {
    this.screenOffset = new Point(
      this.screenOffset.x - screenOffsetX / this.screenScale,
      this.screenOffset.y - screenOffsetY / this.screenScale,
    );
  }

  /**
   * This function takes the deltaY from the mouse wheel event and zooms the screen in or out
   * The location of the mouse in world space is preserved
   * @param deltaY
   */
  public zoomScreen(deltaY: number) {
    const worldMouseLocationBeforeZoom = this.getWorldMouseLocation();
    const newScreenScale =
      this.getScreenScale() *
      (1 - MOUSE_ZOOM_MULTIPLIER * (deltaY / Math.abs(deltaY)));
    this.setScreenScale(newScreenScale);

    // now get the location of the cursor in world space again
    // It will have changed because the scale has changed,
    // but we can offset our world now to fix the zoom location in screen space,
    // because we know how much it changed laterally between the two spatial scales.
    const worldMouseLocationAfterZoom = this.getWorldMouseLocation();

    // Adjust the screen offset to maintain the cursor position
    this.screenOffset = new Point(
      this.screenOffset.x +
        (worldMouseLocationBeforeZoom.x - worldMouseLocationAfterZoom.x),
      this.screenOffset.y +
        (worldMouseLocationBeforeZoom.y - worldMouseLocationAfterZoom.y),
    );
  }

  public setLineStyles(
    isHighlighted: boolean,
    isSelected: boolean,
    color: string,
    lineWidth: number,
    dash: number[] = [],
  ) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.setLineDash(dash);

    if (isHighlighted) {
      this.context.lineWidth = lineWidth + 1;
    }

    if (isSelected) {
      this.context.setLineDash([5, 5]);
    }
  }

  public clearCanvas() {
    if (this.canvasSize === null) return;

    if (!this.context) return;

    this.context.fillStyle = CANVAS_BACKGROUND_COLOR;
    this.context.fillRect(0, 0, this.canvasSize?.x, this.canvasSize?.y);
  }

  /**
   * Draws a line from startPoint to endPoint and auto converts to screen space first
   * @param startPoint
   * @param endPoint
   */
  public drawLine(startPoint: Point, endPoint: Point): void {
    const [screenStartPoint, screenEndPoint] = this.worldsToScreens([
      startPoint,
      endPoint,
    ]);

    this.screenDrawLine(screenStartPoint, screenEndPoint);
  }

  public screenDrawLine(screenStartPoint: Point, screenEndPoint: Point): void {
    this.context.beginPath();
    this.context.moveTo(screenStartPoint.x, screenStartPoint.y);
    this.context.lineTo(screenEndPoint.x, screenEndPoint.y);
    this.context.stroke();
  }

  /**
   * Draw an arc (segment of a circle) or a circle if startAngle = 0 and endAngle = 2PI
   * @param centerPoint
   * @param radius
   * @param startAngle
   * @param endAngle
   */
  public drawArc(
    centerPoint: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
  ) {
    const screenCenterPoint = this.worldToScreen(centerPoint);
    const screenRadius = radius * this.screenScale;
    this.context.beginPath();
    this.context.arc(
      screenCenterPoint.x,
      screenCenterPoint.y,
      screenRadius,
      startAngle,
      endAngle,
    );
    this.context.stroke();
  }

  /**
   * Draws an arrow head which ends at the endPoint
   * The start point doesn't really matter, only the direction
   * the size of the arrow is determined by ARROW_HEAD_SIZE
   * @param startPoint
   * @param endPoint
   */
  public drawArrowHead(startPoint: Point, endPoint: Point): void {
    const vectorFromEndToStart = new Vector(endPoint, startPoint);
    const vectorFromEndToStartUnit = vectorFromEndToStart.normalize();
    const baseOfArrow = endPoint
      .clone()
      .translate(
        vectorFromEndToStartUnit.multiply(ARROW_HEAD_LENGTH * this.screenScale),
      );
    const perpendicularVector1 = vectorFromEndToStartUnit.rotate(
      90 * TO_RADIANS,
    );
    const perpendicularVector2 = vectorFromEndToStartUnit.rotate(
      -90 * TO_RADIANS,
    );
    const leftCornerOfArrow = baseOfArrow
      .clone()
      .translate(
        perpendicularVector1.multiply(ARROW_HEAD_WIDTH * this.screenScale),
      );
    const rightCornerOfArrow = baseOfArrow
      .clone()
      .translate(
        perpendicularVector2.multiply(ARROW_HEAD_WIDTH * this.screenScale),
      );

    const [screenEndPoint, screenLeftCornerOfArrow, screenRightCornerOfArrow] =
      this.worldsToScreens([endPoint, leftCornerOfArrow, rightCornerOfArrow]);

    this.context.beginPath();
    this.context.moveTo(screenEndPoint.x, screenEndPoint.y);
    this.context.lineTo(screenLeftCornerOfArrow.x, screenLeftCornerOfArrow.y);
    this.context.lineTo(screenRightCornerOfArrow.x, screenRightCornerOfArrow.y);
    this.context.lineTo(screenEndPoint.x, screenEndPoint.y);
    this.context.fillStyle = '#FFF';
    this.context.stroke();
    this.context.fill();
  }

  /**
   * Draw some text at the base location
   * The direction vector points from the bottom of the first letter towards the bottom of the last letter indicate the rotation of the text   * @param label
   * @param label
   * @param basePoint
   * @param options
   */
  public drawText(
    label: string,
    basePoint: Point,
    options: Partial<{
      textDirection?: Vector;
      textAlign: 'left' | 'center' | 'right';
      textColor: string;
      fontSize: number;
      fontFamily: string;
    }> = {},
  ): void {
    const screenBasePoint = this.worldToScreen(basePoint);
    this.drawTextScreen(label, screenBasePoint, {
      ...options,
      fontSize: options.fontSize
        ? options.fontSize * this.screenScale
        : undefined,
    });
  }

  /**
   * Draw some text at the base location
   * The direction vector points from the bottom of the first letter towards the bottom of the last letter indicate the rotation of the text
   * @param label
   * @param basePoint
   * @param options
   */
  public drawTextScreen(
    label: string,
    basePoint: Point,
    options: Partial<{
      textDirection?: Vector;
      textAlign: 'left' | 'center' | 'right';
      textColor: string;
      fontSize: number;
      fontFamily: string;
    }> = {},
  ): void {
    const opts = {
      textDirection: new Vector(1, 0),
      textAlign: 'center' as const,
      textColor: '#FFF',
      fontSize: CANVAS_INPUT_FIELD_FONT_SIZE,
      fontFamily: 'sans-serif',
      ...options,
    };
    this.context.save();
    this.context.translate(basePoint.x, basePoint.y);
    const angle = Math.atan2(opts.textDirection.y, opts.textDirection.x);
    this.context.rotate(angle);
    this.context.font = `${opts.fontSize}px ${opts.fontFamily}`;
    this.context.textAlign = opts.textAlign;
    this.context.fillStyle = opts.textColor;
    this.context.fillText(label, 0, 0);
    this.context.restore();
  }

  /**
   * Draw an image to the canvas using world coordinates
   * @param imageElement
   * @param xMin
   * @param yMin
   * @param width
   * @param height
   * @param angle
   */
  public drawImage(
    imageElement: HTMLImageElement,
    xMin: number,
    yMin: number,
    width: number,
    height: number,
    angle: number,
  ): void {
    const [screenBasePoint, screenDimensions] = this.worldsToScreens([
      new Point(xMin, yMin),
      new Point(width, height),
    ]);
    const screenXMin = screenBasePoint.x;
    const screenYMin = screenBasePoint.y;
    const screenWidth = screenDimensions.x;
    const screenHeight = screenDimensions.y;
    const screenCenterX = screenXMin + screenWidth / 2;
    const screenCenterY = screenYMin + screenHeight / 2;

    // Rotate and translate context
    this.context.translate(screenCenterX, screenCenterY);
    this.context.rotate(angle);

    // Draw image
    this.context.drawImage(
      imageElement,
      -screenWidth / 2,
      -screenHeight / 2,
      screenWidth,
      screenHeight,
    );

    // Reset context
    this.context.rotate(-angle);
    this.context.translate(-screenCenterX, -screenCenterY);
  }

  /**
   * Convert coordinates from World Space --> Screen Space
   */
  public worldToScreen(worldCoordinate: Point): Point {
    return new Point(
      (worldCoordinate.x - this.screenOffset.x) * this.screenScale,
      (worldCoordinate.y - this.screenOffset.y) * this.screenScale,
    );
  }

  public worldsToScreens(worldCoordinates: Point[]): Point[] {
    return worldCoordinates.map(this.worldToScreen.bind(this));
  }

  /**
   * Convert coordinates from Screen Space --> World Space
   */
  public screenToWorld(screenCoordinate: Point): Point {
    return new Point(
      screenCoordinate.x / this.screenScale + this.screenOffset.x,
      screenCoordinate.y / this.screenScale + this.screenOffset.y,
    );
  }

  public screensToWorlds(screenCoordinates: Point[]): Point[] {
    return screenCoordinates.map(this.screenToWorld.bind(this));
  }

  /**
   * Fill rectangle with color, but interpret the provided coordinates as screen coordinates
   * @param xMin
   * @param yMin
   * @param width
   * @param height
   * @param color
   */
  fillRectScreen(
    xMin: number,
    yMin: number,
    width: number,
    height: number,
    color: string,
  ) {
    this.context.fillStyle = color;
    this.context.fillRect(xMin, yMin, width, height);
  }
}
