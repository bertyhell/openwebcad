import { Point } from '@flatten-js/core';
import { DEFAULT_TEXT_OPTIONS, DrawController } from './DrawController';
import { TextOptions } from '../entities/TextEntity.ts';
import jsPDF from 'jspdf';
import { mapNumberRange } from '../helpers/map-number-range.ts';
import { PDF_LINE_WIDTH_FACTOR, TO_RADIANS } from '../App.consts.ts';

export class PdfDrawController implements DrawController {
    private doc: jsPDF;

    constructor(
        private worldBoundingBoxMinX: number,
        private worldBoundingBoxMinY: number,
        private worldBoundingBoxMaxX: number,
        private worldBoundingBoxMaxY: number,
        private canvasBoundingBoxMinX: number,
        private canvasBoundingBoxMinY: number,
        private canvasBoundingBoxMaxX: number,
        private canvasBoundingBoxMaxY: number,
    ) {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });
    }

    public getCanvasSize(): Point {
        return new Point(
            this.canvasBoundingBoxMaxX - this.canvasBoundingBoxMinX,
            this.canvasBoundingBoxMaxY - this.canvasBoundingBoxMinY,
        );
    }

    public getScreenScale() {
        return (
            (this.canvasBoundingBoxMaxX - this.canvasBoundingBoxMinX) /
            (this.worldBoundingBoxMaxY - this.worldBoundingBoxMinY)
        );
    }

    public getScreenOffset() {
        return new Point(
            this.canvasBoundingBoxMinX,
            this.canvasBoundingBoxMinY,
        );
    }

    /**
     * Convert coordinates from World Space --> Target Space (pdf page coordinates)
     */
    public worldToTarget(worldCoordinate: Point): Point {
        return new Point(
            mapNumberRange(
                worldCoordinate.x,
                this.worldBoundingBoxMinX,
                this.worldBoundingBoxMaxX,
                this.canvasBoundingBoxMinX,
                this.canvasBoundingBoxMaxX,
            ),
            mapNumberRange(
                worldCoordinate.y,
                this.worldBoundingBoxMinY,
                this.worldBoundingBoxMaxY,
                this.canvasBoundingBoxMaxY, // inverted since world origin is bottom left and pdf origin is top left
                this.canvasBoundingBoxMinY,
            ),
        );
    }

    public worldsToTargets(worldCoordinates: Point[]): Point[] {
        return worldCoordinates.map(this.worldToTarget.bind(this));
    }

    /**
     * Convert coordinates from Target Space (pdf page) --> World Space
     */
    public targetToWorld(targetCoordinate: Point): Point {
        return new Point(
            mapNumberRange(
                targetCoordinate.x,
                this.canvasBoundingBoxMinX,
                this.canvasBoundingBoxMaxX,
                this.worldBoundingBoxMinX,
                this.worldBoundingBoxMaxX,
            ),
            mapNumberRange(
                targetCoordinate.y,
                this.canvasBoundingBoxMinY,
                this.canvasBoundingBoxMaxY,
                this.worldBoundingBoxMinY,
                this.worldBoundingBoxMaxY,
            ),
        );
    }

    public targetsToWorlds(targetCoordinates: Point[]): Point[] {
        return targetCoordinates.map(this.targetToWorld.bind(this));
    }

    public clear() {
        // Cannot clear a pdf page
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
            this.doc.setDrawColor('#000');
        } else if (
            lineColor.toLowerCase() === '#000' ||
            lineColor.toLowerCase() === '#000000' ||
            lineColor === 'black'
        ) {
            this.doc.setDrawColor('#FFF');
        } else {
            this.doc.setDrawColor(lineColor);
        }

        this.doc.setLineWidth(lineWidth * PDF_LINE_WIDTH_FACTOR);

        if (lineDash.length >= 1) {
            this.doc.setLineDashPattern(lineDash, 0);
        }
    }

    public setFillStyles(fillColor: string) {
        if (
            fillColor.toLowerCase() === '#fff' ||
            fillColor.toLowerCase() === '#ffffff' ||
            fillColor === 'white'
        ) {
            this.doc.setFillColor('#000');
        } else if (
            fillColor.toLowerCase() === '#000' ||
            fillColor.toLowerCase() === '#000000' ||
            fillColor === 'black'
        ) {
            this.doc.setFillColor('#FFF');
        } else {
            this.doc.setFillColor(fillColor);
        }
    }

    public export(): Promise<Blob> {
        return new Promise(resolve => {
            const pdfBlob = this.doc.output('blob');
            resolve(pdfBlob);
        });
    }

    public drawLine(startPoint: Point, endPoint: Point): void {
        const [canvasStartPoint, canvasEndPoint] = this.worldsToTargets([
            startPoint,
            endPoint,
        ]);
        this.doc.line(
            canvasStartPoint.x,
            canvasStartPoint.y,
            canvasEndPoint.x,
            canvasEndPoint.y,
        );
        this.doc.stroke();
    }

    public drawArc(
        centerPoint: Point,
        radius: number,
        startAngle: number,
        endAngle: number,
        counterClockwise: boolean,
    ) {
        const canvasCenterPoint = this.worldToTarget(centerPoint);
        const canvasRadius = radius * this.getScreenScale();

        if (endAngle - startAngle === 360 * TO_RADIANS) {
            // draw circle
            this.doc.circle(
                canvasCenterPoint.x,
                canvasCenterPoint.y,
                canvasRadius,
            );
            return;
        }
        // draw arc
        // TODO
        this.doc.circle(canvasCenterPoint.x, canvasCenterPoint.y, canvasRadius);
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

        this.doc.setFontSize(textOptions.fontSize);
        this.doc.setTextColor(textOptions.textColor);
        this.doc.text(label, canvasBasePoint.x, canvasBasePoint.y, {
            align: textOptions.textAlign,
        });
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

        this.doc.addImage(
            imageElement,
            'PNG',
            xMin,
            yMin,
            width,
            height,
            undefined,
            undefined,
            angle,
        );
    }

    public fillPolygon(...points: Point[]) {
        if (points.length < 3) return;
        const canvasPoints = this.worldsToTargets(points);

        this.doc.setFillColor(this.doc.getDrawColor());

        for (let i = 1; i < canvasPoints.length; i++) {}
    }
}
