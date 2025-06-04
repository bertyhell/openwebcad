import {CANVAS_BACKGROUND_COLOR, MOUSE_ZOOM_MULTIPLIER} from '../App.consts';
import {Point, type Vector} from '@flatten-js/core';
import {DEFAULT_TEXT_OPTIONS, type DrawController} from './DrawController';
import {triggerReactUpdate} from '../state.ts';
import {StateVariable} from '../helpers/undo-stack.ts';
import {mapNumberRange} from '../helpers/map-number-range.ts';

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
    private screenScale = 1;
    private screenMouseLocation: Point;
    private canvasSize: Point = new Point(100, 100);

    constructor(
        private context: CanvasRenderingContext2D,
    ) {
        this.screenMouseLocation = new Point(this.canvasSize.x / 2, this.canvasSize.y / 2);
        this.setScreenOffset(new Point(0, 0)); // User expects mathematical coordinates, where y axis goes up, but canvas y axis goes down
    }

    public getCanvasSize() {
        return this.canvasSize;
    }

    public setCanvasSize(newCanvasSize: Point) {
        this.canvasSize = newCanvasSize;
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
        this.screenMouseLocation = newScreenMouseLocation;
        triggerReactUpdate(StateVariable.screenMouseLocation);
    }

    public getWorldMouseLocation(): Point {
        return this.targetToWorld(this.screenMouseLocation);
    }

    public getScreenMouseLocation(): Point {
        return this.screenMouseLocation;
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
        const oldScreenScale = this.getScreenScale();

        const newScreenScale =
            oldScreenScale *
            (1 - MOUSE_ZOOM_MULTIPLIER * (deltaY / Math.abs(deltaY)));
        this.setScreenScale(newScreenScale);

        // now get the location of the cursor in world space again
        // It will have changed because the scale has changed,
        // but we can offset our world now to fix the zoom location in screen space,
        // because we know how much it changed laterally between the two spatial scales.
        const worldMouseLocationAfterZoom = this.getWorldMouseLocation();

        const offsetAdjustment = new Point(
            worldMouseLocationBeforeZoom.x - worldMouseLocationAfterZoom.x,
            worldMouseLocationBeforeZoom.y - worldMouseLocationAfterZoom.y,
        );

        // Adjust the screen offset to maintain the cursor position
        this.screenOffset = new Point(
            this.screenOffset.x + offsetAdjustment.x,
            this.screenOffset.y + offsetAdjustment.y,
        );
    }

    /**
     * Convert coordinates from World Space --> Screen Space
     */
    public worldToTarget(worldCoordinate: Point): Point {
        return new Point(
            mapNumberRange(
                worldCoordinate.x,
                this.screenOffset.x,
                this.screenOffset.x + this.canvasSize.x / this.screenScale,
                0,
                this.canvasSize.x,
            ),
            mapNumberRange(
                worldCoordinate.y,
                this.screenOffset.y,
                this.screenOffset.y + this.canvasSize.y / this.screenScale,
                0,
                this.canvasSize.y,
            ),
        );
    }

    public worldsToTargets(worldCoordinates: Point[]): Point[] {
        return worldCoordinates.map(this.worldToTarget.bind(this));
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
    public targetToWorld(screenCoordinate: Point): Point {
        // map the screen coordinate to the world coordinate based on this.getScreenOffset() and the this.getScreenScale()
        return new Point(
            mapNumberRange(
                screenCoordinate.x,
                0,
                this.canvasSize.x,
                this.screenOffset.x,
                this.screenOffset.x + this.canvasSize.x / this.screenScale,
            ),
            mapNumberRange(
                screenCoordinate.y,
                0,
                this.canvasSize.y,
                this.screenOffset.y,
                this.screenOffset.y + this.canvasSize.y / this.screenScale,
            ),
        );
    }

    public targetsToWorlds(screenCoordinates: Point[]): Point[] {
        return screenCoordinates.map(this.targetToWorld.bind(this));
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
        const [screenStartPoint, screenEndPoint] = this.worldsToTargets([
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
    public drawLineScreen(
        screenStartPoint: Point,
        screenEndPoint: Point,
    ): void {
        this.context.beginPath();
        this.context.moveTo(screenStartPoint.x, this.canvasSize.y - screenStartPoint.y);
        this.context.lineTo(screenEndPoint.x, this.canvasSize.y - screenEndPoint.y);
        this.context.stroke();

        const lineWidth = this.context.lineWidth;
        const style = this.context.strokeStyle as string;
        this._drawRoundedEndpoint(screenStartPoint, lineWidth, style);
        this._drawRoundedEndpoint(screenEndPoint, lineWidth, style);
    }

    private _drawRoundedEndpoint(screenPoint: Point, lineWidth: number, style: string): void {
        this.context.fillStyle = style;
        this.context.beginPath();
        this.context.arc(screenPoint.x, this.canvasSize.y - screenPoint.y, lineWidth / 2, 0, 2 * Math.PI);
        this.context.fill();
    }

    /**
     * Draw an arc (segment of a circle) or a circle if startAngle = 0 and endAngle = 2PI
     * @param centerPoint
     * @param radius
     * @param startAngle
     * @param endAngle
     * @param counterClockWise
     */
    public drawArc(
        centerPoint: Point,
        radius: number,
        startAngle: number,
        endAngle: number,
        counterClockWise: boolean,
    ) {
        const screenCenterPoint = this.worldToTarget(centerPoint);
        const screenRadius = radius * this.screenScale;
        this.drawArcScreen(
            screenCenterPoint,
            screenRadius,
            startAngle,
            endAngle,
            counterClockWise,
        );
    }

    public drawArcScreen(
        screenCenterPoint: Point,
        screenRadius: number,
        startAngle: number,
        endAngle: number,
        counterClockWise: boolean,
    ) {
        this.context.beginPath();
        this.context.arc(
            screenCenterPoint.x,
            this.canvasSize.y - screenCenterPoint.y,
            screenRadius,
            startAngle,
            endAngle,
            counterClockWise,
        );
        this.context.stroke();

        const lineWidth = this.context.lineWidth;
        const style = this.context.strokeStyle as string;

        // Calculate arc endpoints
        const startScreenX = screenCenterPoint.x + screenRadius * Math.cos(startAngle);
        // Y is inverted in canvas, but also for the arc angles, so we subtract from canvasSize.y and then add sin
        const startScreenY = (this.canvasSize.y - screenCenterPoint.y) + screenRadius * Math.sin(startAngle); 
        const endScreenX = screenCenterPoint.x + screenRadius * Math.cos(endAngle);
        const endScreenY = (this.canvasSize.y - screenCenterPoint.y) + screenRadius * Math.sin(endAngle);

        // Convert back to Point objects, note that _drawRoundedEndpoint expects y to be from top of canvas
        const arcStartPoint = new Point(startScreenX, this.canvasSize.y - startScreenY);
        const arcEndPoint = new Point(endScreenX, this.canvasSize.y - endScreenY);
        
        this._drawRoundedEndpoint(arcStartPoint, lineWidth, style);
        this._drawRoundedEndpoint(arcEndPoint, lineWidth, style);
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
        const screenBasePoint = this.worldToTarget(basePoint);
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
        this.context.translate(basePoint.x, this.canvasSize.y - basePoint.y);
        const angle = Math.atan2(-opts.textDirection.y, opts.textDirection.x);
        this.context.rotate(angle);
        this.context.font = `${opts.fontSize}px ${opts.fontFamily}`;
        this.context.textAlign = opts.textAlign;
        this.context.fillStyle = opts.textColor;
        this.context.textBaseline = 'middle';
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
        const [screenBasePoint, screenDimensions] = this.worldsToTargets([
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
        const screenMinPoint = this.worldToTarget(new Point(xMin, yMin));

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
        this.context.fillRect(xMin, this.canvasSize.y - yMin, width, height);
    }

    /**
     * Fill polygon with color
     * @param points
     */
    public fillPolygon(...points: Point[]) {
        const screenPoints = points.map(this.worldToTarget.bind(this));
        this.context.beginPath();
        screenPoints.forEach((screenPoint, index) => {
            if (index === 0) {
                this.context.moveTo(screenPoint.x, this.canvasSize.y - screenPoint.y);
            } else {
                this.context.lineTo(screenPoint.x, this.canvasSize.y - screenPoint.y);
            }
        });
        this.context.closePath();
        this.context.fill();
    }
}
