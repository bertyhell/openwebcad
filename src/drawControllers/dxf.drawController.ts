import { Point, Box, Vector } from '@flatten-js/core';
import type DxfWriter from 'dxf-writer';
import { DrawController, DEFAULT_TEXT_OPTIONS } from './DrawController';
import type { TextOptions } from '../entities/TextEntity';
import { getExportColor } from '../helpers/get-export-color';
import { TO_DEGREES } from '../App.consts';

export class DxfDrawController implements DrawController {
    private lineColor = '#000000'; // Default to black
    private lineWidth = 0.13; // Default DXF line weight
    // DXF does not directly support line dash patterns in the same way SVG/Canvas do for all entities.
    // It's often handled by linetype definitions, which is more complex than direct dash arrays.
    // For simplicity, we'll ignore lineDash for now or apply it as a general linetype if supported for specific entities.
    private dxfDrawing: DxfWriter;
    private boundingBox: Box; // Store the bounding box


    constructor(dxfDrawing: DxfWriter, boundingBox: Box) {
        this.dxfDrawing = dxfDrawing;
        this.boundingBox = boundingBox; // Initialize boundingBox
    }

    // --- Style methods ---
    setLineStyles(_isHighlighted: boolean, _isSelected: boolean, lineColor: string, lineWidth: number, _lineDash: number[] = []): void {
        this.lineColor = getExportColor(lineColor);
        // Convert pixel lineWidth to a reasonable DXF line weight.
        // This might need adjustment based on visual results.
        // Common DXF line weights: 0.00mm, 0.05mm, 0.09mm, 0.13mm, 0.15mm, 0.18mm, 0.20mm, 0.25mm, etc.
        // Assuming 1px = 0.13mm for now as a starting point
        this.lineWidth = lineWidth * 0.13;
        // Line dash is complex in DXF, typically requires LTYPE definitions.
        // We'll ignore it for basic implementation.
    }

    setFillStyles(fillColor: string): void {
        // DXF fill is typically done using HATCH entities, which is complex.
        // For simple entities like CIRCLE or LINE, there isn't a direct fill color property.
        // We will ignore fill styles for now, as it's not straightforward for all entity types.
        // Alternatively, could try to use SOLID hatch for polygons if implemented.
        console.warn(`DXF export does not directly support fill color: ${fillColor} will be ignored for most entities.`);
    }

    // --- Coordinate transformation methods ---
    // DXF typically uses world coordinates directly. No complex transformations needed here unless dealing with viewports.
    // For this implementation, we assume entities are already in world coordinates.
    worldToTarget(worldCoordinate: Point): Point {
        // In DXF, the Y-axis is typically positive upwards.
        // Our internal representation might be different (e.g., Y positive downwards for screen).
        // For now, assume direct mapping, but this might need adjustment based on how entities are defined.
        return worldCoordinate;
    }

    worldsToTargets(worldCoordinates: Point[]): Point[] {
        return worldCoordinates.map(p => this.worldToTarget(p));
    }

    targetToWorld(targetCoordinate: Point): Point {
        return targetCoordinate; // Direct mapping
    }

    targetsToWorlds(targetCoordinates: Point[]): Point[] {
        return targetCoordinates.map(p => this.targetToWorld(p));
    }

    // --- Drawing methods ---
    drawLine(startPoint: Point, endPoint: Point): void {
        const [s, e] = this.worldsToTargets([startPoint, endPoint]);
        // Assuming color and lineWeight are handled by layer properties or global settings in DxfWriter
        // Or that options should be passed if the signature is drawLine(x1, y1, x2, y2, options?)
        // For now, relying on active layer properties or defaults for color/lineWeight.
        // Corrected: Removed z=0, options object is last. Color needs to be ACI.
        this.dxfDrawing.drawLine(s.x, s.y, e.x, e.y);
    }

    drawArc(centerPoint: Point, radius: number, startAngle: number, endAngle: number, counterClockwise: boolean): void {
        const center = this.worldToTarget(centerPoint);
        let dxfStartAngle = startAngle * TO_DEGREES;
        let dxfEndAngle = endAngle * TO_DEGREES;

        if (!counterClockwise) {
            [dxfStartAngle, dxfEndAngle] = [dxfEndAngle, dxfStartAngle];
        }

        // Styling (color, lineWeight) is assumed to be handled by current layer properties in DxfWriter
        this.dxfDrawing.drawArc(center.x, center.y, radius, dxfStartAngle, dxfEndAngle);
    }

    drawCircle(centerPoint: Point, radius: number): void {
        const center = this.worldToTarget(centerPoint);
        // Styling is assumed to be handled by current layer properties
        this.dxfDrawing.drawCircle(center.x, center.y, radius);
    }

    drawText(label: string, basePoint: Point, options?: Partial<TextOptions>): void {
        const pt = this.worldToTarget(basePoint);
        const textOptions = { ...DEFAULT_TEXT_OPTIONS, ...options };

        // let rotation = 0; // Rotation and color would be set by Text Style or Layer
        // if (textOptions.textDirection) {
        //     rotation = new Vector(1, 0).angleTo(textOptions.textDirection) * TO_DEGREES;
        // }

        // Assuming color, rotation are handled by text styles set on DxfWriter instance.
        // Signature: drawText(x, y, z, height, value, options?)
        // Adding z=0 back. For options, pass empty object if needed, or handle text style globally.
        this.dxfDrawing.drawText(pt.x, pt.y, 0, textOptions.fontSize, label);
    }

    drawImage(_imageElement: HTMLImageElement, _xMin: number, _yMin: number, _width: number, _height: number, _angle: number): void {
        console.warn("DXF export for images is not implemented.");
    }

    fillPolygon(...points: Point[]): void {
        if (points.length < 3) return;
        const worldPoints = points.map(p => [p.x, p.y] as [number, number]);

        // Styling assumed to be handled by layer. isClosed is the second param.
        this.dxfDrawing.drawPolyline(worldPoints, true);
        console.warn("DXF fillPolygon is implemented as a closed polyline. Actual fill (HATCH) is not implemented.");
    }


    // --- Other DrawController methods (may not be fully applicable to DXF) ---
    clear(): void {
        // DxfWriter instance is typically created fresh for each export, so clear might not be needed.
        // If the same instance were reused, one might need a way to reset it.
        console.warn("DxfDrawController.clear() called, but DxfWriter instances are usually not cleared/reused in this workflow.");
    }

    getCanvasSize(): Point {
        // Return the size of the drawing based on the bounding box
        const width = this.boundingBox.xmax - this.boundingBox.xmin;
        const height = this.boundingBox.ymax - this.boundingBox.ymin;
        return new Point(width, height);
    }

    getScreenScale(): number {
        // DXF is unitless / uses real-world units. "Screen scale" isn't directly applicable.
        return 1;
    }

    setScreenScale(_newScreenScale: number): void {
        // See getScreenScale
    }

    getScreenOffset(): Point {
        // DXF uses an origin (0,0,0). An "offset" could be interpreted as a translation of all entities,
        // but that's usually handled by transforming entities before drawing.
        return new Point(0,0);
    }

    setScreenOffset(_newScreenOffset: Point): void {
        // See getScreenOffset
    }

    // Optional: Method to directly access the DxfWriter instance if needed
    getDxfWriterInstance(): DxfWriter {
        return this.dxfDrawing;
    }
}
