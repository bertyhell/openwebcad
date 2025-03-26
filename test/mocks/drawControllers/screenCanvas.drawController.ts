/* eslint-disable @typescript-eslint/no-unused-vars */
// noinspection JSUnusedLocalSymbols

import {Point, Vector} from '@flatten-js/core';
import {DrawController} from '../../../src/drawControllers/DrawController';
import {triggerReactUpdate} from '../../../src/state';
import {StateVariable} from '../../../src/helpers/undo-stack';
import {MOUSE_ZOOM_MULTIPLIER} from '../../../src/App.consts';
import {mapNumberRange} from '../../../src/helpers/map-number-range';

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
        private context: CanvasRenderingContext2D | null,
        private canvasSize: Point,
    ) {
        this.worldMouseLocation = this.targetToWorld(
            new Point(canvasSize.x / 2, canvasSize.y / 2),
        );
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
        this.worldMouseLocation = this.targetToWorld(newScreenMouseLocation);
        triggerReactUpdate(StateVariable.screenMouseLocation);
    }

    public getWorldMouseLocation(): Point {
        return this.worldMouseLocation;
    }

    public getScreenMouseLocation(): Point {
        return this.worldToTarget(this.worldMouseLocation);
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
                (worldMouseLocationBeforeZoom.x -
                    worldMouseLocationAfterZoom.x),
            this.screenOffset.y +
                (worldMouseLocationBeforeZoom.y -
                    worldMouseLocationAfterZoom.y),
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
                this.screenOffset.y + this.canvasSize.y / this.screenScale, // inverted since world origin is bottom left and screen  origin is top left
                this.screenOffset.y,
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
    ) {}

    public setFillStyles(fillColor: string) {}

    public clear() {}

    /**
     * Draws a line from startPoint to endPoint and auto converts to screen space first
     * @param worldStartPoint
     * @param worldEndPoint
     */
    public drawLine(worldStartPoint: Point, worldEndPoint: Point): void {}

    /**
     * Needs to be public to draw UI that is zoom independent, like snap point indicators
     * @param screenStartPoint
     * @param screenEndPoint
     */
    public drawLineScreen(
        screenStartPoint: Point,
        screenEndPoint: Point,
    ): void {}

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
    ) {}

    public drawArcScreen(
        screenCenterPoint: Point,
        screenRadius: number,
        startAngle: number,
        endAngle: number,
        counterClockWise: boolean,
    ) {}

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
    ): void {}

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
    ): void {}

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
    ): void {}

    public fillRect(
        xMin: number,
        yMin: number,
        width: number,
        height: number,
        color: string,
    ) {}

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
    ) {}

    /**
     * Fill polygon with color
     * @param points
     */
    public fillPolygon(...points: Point[]) {}
}
