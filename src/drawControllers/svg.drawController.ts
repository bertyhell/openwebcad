import { Point } from '@flatten-js/core';
import { DEFAULT_TEXT_OPTIONS, DrawController } from './DrawController';
import { SVG_MARGIN } from '../App.consts.ts';
import { TextOptions } from '../entities/TextEntity.ts';
import { triggerReactUpdate } from '../state.ts';
import { StateVariable } from '../helpers/undo-stack.ts';
import { isLengthEqual } from '../helpers/is-length-equal.ts';

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
    public worldToTarget(worldCoordinate: Point): Point {
        return new Point(
            (worldCoordinate.x - this.screenOffset.x) * this.screenScale,
            -1 *
                ((worldCoordinate.y - this.screenOffset.y) * this.screenScale -
                    this.getCanvasSize().y),
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
        return new Point(
            screenCoordinate.x / this.screenScale + this.screenOffset.x,
            this.getCanvasSize().y -
                screenCoordinate.y / this.screenScale +
                this.screenOffset.y,
        );
    }

    public targetsToWorlds(screenCoordinates: Point[]): Point[] {
        return screenCoordinates.map(this.targetToWorld.bind(this));
    }

    public clear() {
        this.svgStrings = [];
    }

    public setLineStyles(
        _isHighlighted: boolean,
        _isSelected: boolean,
        lineColor: string,
        lineWidth: number,
        lineDash: number[] = [],
    ) {
        if (
            lineColor.toLowerCase() === '#fff' ||
            lineColor.toLowerCase() === '#ffffff' ||
            lineColor === 'white'
        ) {
            this.lineColor = '#000';
        } else if (
            lineColor.toLowerCase() === '#000' ||
            lineColor.toLowerCase() === '#000000' ||
            lineColor === 'black'
        ) {
            this.lineColor = '#FFF';
        } else {
            this.lineColor = lineColor;
        }
        this.lineWidth = lineWidth;
        this.lineDash = lineDash;
    }

    public setFillStyles(fillColor: string) {
        if (
            fillColor.toLowerCase() === '#fff' ||
            fillColor.toLowerCase() === '#ffffff' ||
            fillColor === 'white'
        ) {
            this.fillColor = '#000';
        } else if (
            fillColor.toLowerCase() === '#000' ||
            fillColor.toLowerCase() === '#000000' ||
            fillColor === 'black'
        ) {
            this.fillColor = '#FFF';
        } else {
            this.fillColor = fillColor;
        }
    }

    public export() {
        console.log('exporting svg', this.svgStrings);
        const boundingBoxWidth =
            this.boundingBoxMaxX - this.boundingBoxMinX + SVG_MARGIN * 2;
        const boundingBoxHeight =
            this.boundingBoxMaxY - this.boundingBoxMinY + SVG_MARGIN * 2;

        const svgLines = [
            `<svg width="${boundingBoxWidth}" height="${boundingBoxHeight}" xmlns="http://www.w3.org/2000/svg">\n`,
            `    <rect x="0" y="0" width="${boundingBoxWidth}" height="${boundingBoxHeight}" fill="#FFF" />\n`,
            ...this.svgStrings.map(svgString => '\t' + svgString + '\n'),
            '</svg>',
        ];

        return {
            svgLines,
            width: boundingBoxWidth,
            height: boundingBoxHeight,
        };
    }

    public drawLine(startPoint: Point, endPoint: Point): void {
        const [canvasStartPoint, canvasEndPoint] = this.worldsToTargets([
            startPoint,
            endPoint,
        ]);
        this.svgStrings.push(
            `<line x1="${canvasStartPoint.x}" y1="${canvasStartPoint.y}" x2="${canvasEndPoint.x}" y2="${canvasEndPoint.y}" stroke="${this.lineColor}" stroke-width="${this.lineWidth}" stroke-dasharray="${this.lineDash.join(',')}" />`,
        );
    }

    public drawArc(
        centerPoint: Point,
        radius: number,
        startAngle: number,
        endAngle: number,
        counterClockwise: boolean,
    ) {
        const canvasCenterPoint = this.worldToTarget(centerPoint);
        const canvasRadius = radius * this.screenScale;

        // Calculate start and end points of the arc
        let startPoint = new Point(
            canvasCenterPoint.x + canvasRadius,
            canvasCenterPoint.y,
        );
        startPoint = startPoint.rotate(startAngle, canvasCenterPoint);
        let endPoint = new Point(
            canvasCenterPoint.x + canvasRadius,
            canvasCenterPoint.y,
        );
        endPoint = endPoint.rotate(endAngle, canvasCenterPoint);

        // Determine the length of the arc
        const sweep = Math.abs(endAngle - startAngle);

        // Determine the large-arc-flag (1 if the arc spans more than 180 degrees)
        const largeArcFlag = sweep <= Math.PI ? '0' : '1';

        // Sweep flag (1 for clockwise, 0 for counterclockwise)
        const sweepFlag = counterClockwise ? '1' : '0';

        const attributes = `fill="none" stroke="${this.lineColor}" stroke-width="${this.lineWidth}" stroke-dasharray="${this.lineDash.join(',')}"`;
        let svgPath: string;
        if (isLengthEqual(sweep, 2 * Math.PI)) {
            svgPath = `<circle cx="${canvasCenterPoint.x}" cy="${canvasCenterPoint.y}" r="${canvasRadius}" ${attributes} />`;
        } else {
            svgPath = `<path d="M${startPoint.x},${startPoint.y} A${canvasRadius},${canvasRadius} 0 ${largeArcFlag},${sweepFlag} ${endPoint.x},${endPoint.y}" ${attributes}  />`;
        }

        // Push the SVG path data string to the svgStrings array
        this.svgStrings.push(svgPath);
    }

    public drawText(
        label: string,
        basePoint: Point,
        options?: Partial<TextOptions>,
    ): void {
        const canvasBasePoint = this.worldToTarget(basePoint);

        const textOptions = {
            ...DEFAULT_TEXT_OPTIONS,
            ...options,
        };

        this.svgStrings.push(
            `<text x="${canvasBasePoint.x}" y="${canvasBasePoint.y}" fill="${textOptions.textColor}" font-size="${textOptions.fontSize}" font-family="${textOptions.fontFamily}">${label}</text>`,
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
        const canvasPoints = this.worldsToTargets(points);

        const pointsString = canvasPoints.map(p => `${p.x},${p.y}`).join(' ');
        this.svgStrings.push(
            `<polygon points="${pointsString}" fill="${this.fillColor}" />`,
        );
    }
}