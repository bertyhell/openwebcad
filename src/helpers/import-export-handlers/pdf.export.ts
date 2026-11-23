import { saveAs } from 'file-saver';
import { PDF_MARGIN } from '../../App.consts.ts';
import { PdfDrawController } from '../../drawControllers/pdf.drawController.ts';
import type { Entity } from '../../entities/Entity';
import { getVisibleEntities } from '../../state';
import { getBoundingBoxOfMultipleEntities } from '../get-bounding-box-of-multiple-entities.ts';
import { hasEntitiesToExport } from './svg.export.ts';

export async function convertEntitiesToPdfString(entities: Entity[]): Promise<Blob> {
	const boundingBox = getBoundingBoxOfMultipleEntities(entities);

	const pdfDrawController = new PdfDrawController(
		boundingBox.minX - PDF_MARGIN,
		boundingBox.minY - PDF_MARGIN,
		boundingBox.maxX + PDF_MARGIN,
		boundingBox.maxY + PDF_MARGIN
	);

	for (const entity of entities) {
		entity.draw(pdfDrawController);
	}

	return await pdfDrawController.export();
}

export async function exportEntitiesToPdfFile() {
	const entities = getVisibleEntities();
	if (!hasEntitiesToExport(entities)) {
		return;
	}

	const pdfBlob = await convertEntitiesToPdfString(entities);

	const blob = new Blob([pdfBlob], { type: 'application/pdf' });
	saveAs(blob, 'open-web-cad--drawing.pdf');
}
