import { saveAs } from 'file-saver';
import { Entity } from '../../entities/Entity';
import { getEntities } from '../../state';
import { PdfDrawController } from '../../drawControllers/pdf.drawController.ts';
import { A4Format } from '../paper-sizes.ts';
import { containRectangle } from '../contain-rect.ts';

export async function convertEntitiesToPdfString(
    entities: Entity[],
): Promise<Blob> {
    let boundingBoxMinX = Number.MAX_VALUE;
    let boundingBoxMinY = Number.MAX_VALUE;
    let boundingBoxMaxX = Number.MIN_VALUE;
    let boundingBoxMaxY = Number.MIN_VALUE;

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
        boundingBoxMinX,
        boundingBoxMinY,
        boundingBoxMaxX,
        boundingBoxMaxY,
        0,
        0,
        A4Format.x,
        A4Format.y,
    );
    const pdfDrawController = new PdfDrawController(
        boundingBoxMinX,
        boundingBoxMinY,
        boundingBoxMaxX,
        boundingBoxMaxY,
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

    const pdfBlob = await convertEntitiesToPdfString(entities);

    const blob = new Blob([pdfBlob], { type: 'text/pdf;charset=utf-8' });
    saveAs(blob, 'open-web-cad--drawing.pdf');
}
