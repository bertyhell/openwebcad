import { saveAs } from 'file-saver';
import { SVG_MARGIN } from '../../App.consts.ts';
import { PdfDrawController } from '../../drawControllers/pdf.drawController.ts';
import type { Entity } from '../../entities/Entity';
import { getVisibleEntities } from '../../state';
import { getBoundingBoxOfMultipleEntities } from '../get-bounding-box-of-multiple-entities.ts';

export async function convertEntitiesToPdfString(entities: Entity[]): Promise<Blob> {
	const boundingBox = getBoundingBoxOfMultipleEntities(entities);

	const pdfDrawController = new PdfDrawController(
		boundingBox.minX - SVG_MARGIN,
		boundingBox.minY - SVG_MARGIN,
		boundingBox.maxX + SVG_MARGIN,
		boundingBox.maxY + SVG_MARGIN
	);

	for (const entity of entities) {
		entity.draw(pdfDrawController);
	}

	return await pdfDrawController.export();
}

export async function exportEntitiesToPdfFile() {
	const entities = getVisibleEntities();

	const pdfBlob = await convertEntitiesToPdfString(entities);

	const blob = new Blob([pdfBlob], { type: 'text/pdf;charset=utf-8' });
	saveAs(blob, 'open-web-cad--drawing.pdf');
}
