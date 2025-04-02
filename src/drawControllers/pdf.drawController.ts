import type {Point} from '@flatten-js/core';
import type {DrawController} from './DrawController';
import type {TextOptions} from '../entities/TextEntity.ts';
import {jsPDF} from 'jspdf';
import {SvgDrawController} from "./svg.drawController.ts";
import 'svg2pdf.js'

export class PdfDrawController implements DrawController {
    private svgDrawController: SvgDrawController;

    constructor(
        private boundingBoxMinX: number,
        private boundingBoxMinY: number,
        private boundingBoxMaxX: number,
        private boundingBoxMaxY: number,
    ) {
        this.svgDrawController = new SvgDrawController(
            boundingBoxMinX,
            boundingBoxMinY,
            boundingBoxMaxX,
            boundingBoxMaxY,
        );
    }

    public getCanvasSize(): Point {
        return this.svgDrawController.getCanvasSize();
    }

    public getScreenScale() {
        return this.svgDrawController.getScreenScale();
    }

    public getScreenOffset() {
        return this.svgDrawController.getScreenOffset();
    }

    /**
     * Convert coordinates from World Space --> Target Space (pdf page coordinates)
     */
    public worldToTarget(worldCoordinate: Point): Point {
        return worldCoordinate;
    }

    public worldsToTargets(worldCoordinates: Point[]): Point[] {
        return worldCoordinates.map(this.worldToTarget.bind(this));
    }

    /**
     * Convert coordinates from Target Space (pdf page) --> World Space
     */
    public targetToWorld(targetCoordinate: Point): Point {
        return targetCoordinate;
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
        const svgWrapper = document.querySelector('.export-pdf-wrapper');
        if (svgWrapper) {
            svgWrapper.innerHTML = svgExportInfo.svgLines.join('\n');
        } else {
            throw new Error('Could not find svg wrapper: class: export-pdf-wrapper');
        }

        const svgElement = svgWrapper.firstElementChild as Element;

        // Convert svg to pdf
        const width = this.boundingBoxMaxX - this.boundingBoxMinX;
        const height = this.boundingBoxMaxY - this.boundingBoxMinY;
        const doc = new jsPDF(width > height ? 'l' : 'p', 'pt', [width, height])
        await doc.svg(svgElement, {
            x: 0,
            y: 0,
            width: this.boundingBoxMaxX - this.boundingBoxMinX,
            height: this.boundingBoxMaxY - this.boundingBoxMinY,
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
