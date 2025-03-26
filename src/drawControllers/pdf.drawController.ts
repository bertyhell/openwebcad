import {Point} from '@flatten-js/core';
import {DrawController} from './DrawController';
import {TextOptions} from '../entities/TextEntity.ts';
import {jsPDF} from 'jspdf';
import {mapNumberRange} from '../helpers/map-number-range.ts';
import {SvgDrawController} from "./svg.drawController.ts";
import 'svg2pdf.js'

export class PdfDrawController implements DrawController {
    private svgDrawController: SvgDrawController;

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
        this.svgDrawController = new SvgDrawController(canvasBoundingBoxMinX, canvasBoundingBoxMinY, canvasBoundingBoxMaxX, canvasBoundingBoxMaxY);
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
        this.svgDrawController.setLineStyles(_isHighlighted, _isSelected, lineColor, lineWidth, lineDash);
    }

    public setFillStyles(fillColor: string) {
        this.svgDrawController.setFillStyles(fillColor);
    }

    public async export(): Promise<Blob> {
        // Use svg format to then convert it to pdf
        const svgExportInfo = this.svgDrawController.export();
        const svgWrapper = document.createElement('div');
        svgWrapper.setHTMLUnsafe(svgExportInfo.svgLines.join('\n'));
        const svgElement = svgWrapper.firstElementChild as Element;

        // Convert svg to pdf
        const doc = new jsPDF()
        console.log('export to pdf', svgExportInfo);
        await doc.svg(svgElement, {
            x: 0,
            y: 0,
            width: svgExportInfo.width,
            height: svgExportInfo.height,
        });
        return doc.output('blob');
    }

    public drawLine(startPoint: Point, endPoint: Point): void {
        this.svgDrawController.drawLine(startPoint, endPoint);
    }

    public drawArc(
        centerPoint: Point,
        radius: number,
        startAngle: number,
        endAngle: number,
        counterClockwise: boolean,
    ) {
        this.svgDrawController.drawArc(centerPoint, radius, startAngle, endAngle, counterClockwise);
    }

    public drawText(
        label: string,
        basePoint: Point,
        options?: Partial<TextOptions>,
    ): void {
        this.svgDrawController.drawText(label, basePoint, options);
    }

    public drawImage(
        imageElement: HTMLImageElement,
        xMin: number,
        yMin: number,
        width: number,
        height: number,
        angle: number,
    ): void {
        this.svgDrawController.drawImage(imageElement, xMin, yMin, width, height, angle)
    }

    public fillPolygon(...points: Point[]) {
        this.svgDrawController.fillPolygon(...points);
    }
}
