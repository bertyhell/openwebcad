import { saveAs } from 'file-saver';
import type { Entity } from '../../entities/Entity';
import { getEntities } from '../../state';
import { getBoundingBoxOfMultipleEntities, type BoundingBox } from '../get-bounding-box-of-multiple-entities.ts';
import type DxfWriter from 'dxf-writer';
import {DxfDrawController} from '../../drawControllers/dxf.drawController.ts';
import { Box } from '@flatten-js/core'; // Import Box

// Lazy load DxfWriter
let DxfWriterConstructor: typeof DxfWriter | null = null;
const getDxfWriter = async () => {
  if (!DxfWriterConstructor) {
    const module = await import('dxf-writer');
    DxfWriterConstructor = module.default;
  }
  return DxfWriterConstructor;
};

export async function convertEntitiesToDxfString(entities: Entity[]): Promise<string> {
	const bbData: BoundingBox = getBoundingBoxOfMultipleEntities(entities);
	const DxfWriter = await getDxfWriter();
	if (!DxfWriter) {
		throw new Error("Failed to load DxfWriter library");
	}
	const drawing = new DxfWriter();
	const actualBoundingBox = new Box(bbData.minX, bbData.minY, bbData.maxX, bbData.maxY);
	const dxfDrawController = new DxfDrawController(drawing, actualBoundingBox);

	for (const entity of entities) {
		entity.draw(dxfDrawController);
	}

	return drawing.toDxfString();
}

export async function exportEntitiesToDxfFile() {
	const entities = getEntities();

	try {
		const dxfString = await convertEntitiesToDxfString(entities);
		const blob = new Blob([dxfString], { type: 'application/dxf;charset=utf-8' });
		saveAs(blob, 'open-web-cad--drawing.dxf');
	} catch (error) {
		console.error("Error exporting to DXF:", error);
		// Handle error, e.g., show a toast notification
	}
}
