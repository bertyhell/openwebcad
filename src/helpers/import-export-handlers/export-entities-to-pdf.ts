import { saveAs } from 'file-saver';
import { Entity } from '../../entities/Entity';
import { Point } from '@flatten-js/core';
import { SVG_MARGIN } from '../../App.consts';
import { getCanvasSize, getEntities } from '../../state';
import { PdfDrawController } from '../../drawControllers/pdf.drawController.ts';
import { A4Format } from '../paper-sizes.ts';
import { containRectangle } from '../contain-rect.ts';

export async function convertEntitiesToPdfString(
    entities: Entity[],
    canvasSize: Point,
): Promise<Blob> {
    let boundingBoxMinX = canvasSize.x;
    let boundingBoxMinY = canvasSize.y;
    let boundingBoxMaxX = 0;
    let boundingBoxMaxY = 0;

    entities.forEach(entity => {
        const boundingBox = entity.getBoundingBox();
        if (boundingBox) {
            boundingBoxMinX = Math.min(boundingBoxMinX, boundingBox.xmin);
            boundingBoxMinY = Math.min(boundingBoxMinY, boundingBox.ymin);
            boundingBoxMaxX = Math.max(boundingBoxMaxX, boundingBox.xmax);
            boundingBoxMaxY = Math.max(boundingBoxMaxY, boundingBox.ymax);
        }
    });

    const targetRect = containRectangle(
        boundingBoxMinX - SVG_MARGIN,
        boundingBoxMinY - SVG_MARGIN,
        boundingBoxMaxX + SVG_MARGIN,
        boundingBoxMaxY + SVG_MARGIN,
        0,
        0,
        A4Format.x,
        A4Format.y,
    );
    const pdfDrawController = new PdfDrawController(
        boundingBoxMinX - SVG_MARGIN,
        boundingBoxMinY - SVG_MARGIN,
        boundingBoxMaxX + SVG_MARGIN,
        boundingBoxMaxY + SVG_MARGIN,
        targetRect.minX,
        targetRect.minY,
        targetRect.maxX,
        targetRect.maxY,
    );

    entities.forEach(entity => {
        entity.draw(pdfDrawController);
    });

    return await pdfDrawController.export();
}

export async function exportEntitiesToPdfFile() {
    const entities = getEntities();
    const canvasSize = getCanvasSize();

    const pdfBlob = await convertEntitiesToPdfString(entities, canvasSize);

    const blob = new Blob([pdfBlob], { type: 'text/pdf;charset=utf-8' });
    saveAs(blob, 'open-web-cad--drawing.pdf');
}
