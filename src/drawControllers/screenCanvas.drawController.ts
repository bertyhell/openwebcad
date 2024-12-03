import { CANVAS_BACKGROUND_COLOR, MOUSE_ZOOM_MULTIPLIER } from '../App.consts';
import { Point, Vector } from '@flatten-js/core';
import { DEFAULT_TEXT_OPTIONS, DrawController } from './DrawController';
import { triggerReactUpdate } from '../state.ts';
import { StateVariable } from '../helpers/undo-stack.ts';

/**
 * Screen coordinate system:
 *  0, 0         X
 *    +---------->
 *    |
 *    |
 *    |
 * Y  v
 *
 *
 * World coordinate system:
 * Y  ^
 *    |
 *    |
 *    |
 *    +---------->
 *  0, 0         X
 *
 * To convert between the 2 coordinate systems, you need the screenOffset and screenScale
 */
export class ScreenCanvasDrawController implements DrawController {
  private screenOffset: Point = new Point(0, 0);
  private screenScale: number = 1;
  private worldMouseLocation: Point;

  constructor(
    private context: CanvasRenderingContext2D,
    private canvasSize: Point,
  ) {
    this.worldMouseLocation = this.screenToWorld(
      new Point(canvasSize.x / 2, canvasSize.y / 2),
    );
    console.log('setting screen offset: ', 0, 0);
    this.setScreenOffset(new Point(0, 0)); // User expects mathematical coordinates, where y axis goes up, but canvas y axis goes down
  }

  public getCanvasSize() {
    return this.canvasSize;
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

  public setScreenMouseLocation(newScreenMouseLocation: Point): void {
    this.worldMouseLocation = this.screenToWorld(newScreenMouseLocation);
    console.log(
      'mouse move: screen:(' +
        newScreenMouseLocation.x +
        ', ' +
        newScreenMouseLocation.y +
        ')  world:(' +
        this.worldMouseLocation.x +
        ', ' +
        this.worldMouseLocation.y +
        ')',
    );
    triggerReactUpdate(StateVariable.screenMouseLocation);
  }

  public getWorldMouseLocation(): Point {
    return this.worldMouseLocation;
  }

  public getScreenMouseLocation(): Point {
    return this.worldToScreen(this.worldMouseLocation);
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

  /**
   * Convert coordinates from World Space --> Screen Space
   */
  public worldToScreen(worldCoordinate: Point): Point {
    return new Point(
      (worldCoordinate.x - this.screenOffset.x) * this.screenScale,
      -1 *
        ((worldCoordinate.y - this.screenOffset.y) * this.screenScale -
          this.canvasSize.y),
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
      this.canvasSize.y -
        screenCoordinate.y / this.screenScale +
        this.screenOffset.y,
    );
  }

  public screensToWorlds(screenCoordinates: Point[]): Point[] {
    return screenCoordinates.map(this.screenToWorld.bind(this));
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

  public setFillStyles(fillColor: string) {
    this.context.fillStyle = fillColor;
  }

  public clear() {
    if (this.canvasSize === null) return;

    if (!this.context) return;

    this.context.fillStyle = CANVAS_BACKGROUND_COLOR;
    this.context.fillRect(0, 0, this.canvasSize?.x, this.canvasSize?.y);
  }

  /**
   * Draws a line from startPoint to endPoint and auto converts to screen space first
   * @param worldStartPoint
   * @param worldEndPoint
   */
  public drawLine(worldStartPoint: Point, worldEndPoint: Point): void {
    const [screenStartPoint, screenEndPoint] = this.worldsToScreens([
      worldStartPoint,
      worldEndPoint,
    ]);

    this.drawLineScreen(screenStartPoint, screenEndPoint);
  }

  /**
   * Needs to be public to draw UI that is zoom independent, like snap point indicators
   * @param screenStartPoint
   * @param screenEndPoint
   */
  public drawLineScreen(screenStartPoint: Point, screenEndPoint: Point): void {
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
    this.drawArcScreen(screenCenterPoint, screenRadius, startAngle, endAngle);
  }

  public drawArcScreen(
    screenCenterPoint: Point,
    screenRadius: number,
    startAngle: number,
    endAngle: number,
  ) {
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
      ...DEFAULT_TEXT_OPTIONS,
      ...options,
    };
    this.context.save();
    this.context.translate(basePoint.x, basePoint.y);
    const angle = Math.atan2(-opts.textDirection.y, opts.textDirection.x);
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

  public fillRect(
    xMin: number,
    yMin: number,
    width: number,
    height: number,
    color: string,
  ) {
    const screenMinPoint = this.worldToScreen(new Point(xMin, yMin));

    this.fillRectScreen(
      screenMinPoint.x,
      screenMinPoint.y,
      width * this.screenScale,
      height * this.screenScale,
      color,
    );
  }

  /**
   * Fill rectangle with color, but interpret the provided coordinates as screen coordinates
   * @param xMin
   * @param yMin
   * @param width
   * @param height
   * @param color
   */
  public fillRectScreen(
    xMin: number,
    yMin: number,
    width: number,
    height: number,
    color: string,
  ) {
    // TODO see if we need to replace this with a call to fillPolygon
    this.context.fillStyle = color;
    this.context.fillRect(xMin, yMin, width, height);
  }

  /**
   * Fill polygon with color
   * @param points
   */
  public fillPolygon(...points: Point[]) {
    const screenPoints = points.map(this.worldToScreen.bind(this));
    this.context.beginPath();
    screenPoints.forEach((screenPoint, index) => {
      if (index === 0) {
        this.context.moveTo(screenPoint.x, screenPoint.y);
      } else {
        this.context.lineTo(screenPoint.x, screenPoint.y);
      }
    });
    this.context.closePath();
    this.context.fill();
  }
}
