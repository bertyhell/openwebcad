import { Point } from '@flatten-js/core';
import { DEFAULT_TEXT_OPTIONS, DrawController } from './DrawController';
import { TextOptions } from '../entities/TextEntity.ts';
import jsPDF from 'jspdf';
import { mapNumberRange } from '../helpers/map-number-range.ts';

export class PdfDrawController implements DrawController {
    private doc: jsPDF;

    constructor(
        private sourceBoundingBoxMinX: number,
        private sourceBoundingBoxMinY: number,
        private sourceBoundingBoxMaxX: number,
        private sourceBoundingBoxMaxY: number,
        private targetBoundingBoxMinX: number,
        private targetBoundingBoxMinY: number,
        private targetBoundingBoxMaxX: number,
        private targetBoundingBoxMaxY: number,
    ) {
        this.doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });
    }

    getCanvasSize(): Point {
        return new Point(
            this.targetBoundingBoxMaxX - this.targetBoundingBoxMinX,
            this.targetBoundingBoxMaxY - this.targetBoundingBoxMinY,
        );
    }

    public getScreenScale() {
        return (
            (this.targetBoundingBoxMaxX - this.targetBoundingBoxMinX) /
            (this.sourceBoundingBoxMaxY - this.sourceBoundingBoxMinY)
        );
    }

    public getScreenOffset() {
        return new Point(
            this.targetBoundingBoxMinX,
            this.targetBoundingBoxMinY,
        );
    }

    /**
     * Convert coordinates from World Space --> Target Space (pdf page coordinates)
     */
    public worldToTarget(worldCoordinate: Point): Point {
        return new Point(
            mapNumberRange(
                worldCoordinate.x,
                this.sourceBoundingBoxMinX,
                this.sourceBoundingBoxMaxX,
                this.targetBoundingBoxMinX,
                this.targetBoundingBoxMaxX,
            ),
            mapNumberRange(
                worldCoordinate.y,
                this.sourceBoundingBoxMinY,
                this.sourceBoundingBoxMaxY,
                this.targetBoundingBoxMinY,
                this.targetBoundingBoxMaxY,
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
                this.targetBoundingBoxMinX,
                this.targetBoundingBoxMaxX,
                this.sourceBoundingBoxMinX,
                this.sourceBoundingBoxMaxX,
            ),
            mapNumberRange(
                targetCoordinate.y,
                this.targetBoundingBoxMinY,
                this.targetBoundingBoxMaxY,
                this.sourceBoundingBoxMinY,
                this.sourceBoundingBoxMaxY,
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

        this.doc.setLineWidth(lineWidth);

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

        if (endAngle - startAngle === 360) {
            this.doc.circle(
                canvasCenterPoint.x,
                canvasCenterPoint.y,
                canvasRadius,
            );
            return;
        }

        this.doc.context2d.arc(
            canvasCenterPoint.x,
            canvasCenterPoint.y,
            canvasRadius,
            startAngle * (Math.PI / 180),
            endAngle * (Math.PI / 180),
            counterClockwise,
        );
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

        this.doc.context2d.beginPath();
        this.doc.context2d.moveTo(canvasPoints[0].x, canvasPoints[0].y);
        for (let i = 1; i < canvasPoints.length; i++) {
            this.doc.context2d.lineTo(canvasPoints[i].x, canvasPoints[i].y);
        }
        this.doc.context2d.closePath();
        this.doc.context2d.fill();
    }
}
