import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { SVG_MARGIN } from '../../App.consts';
import { SvgDrawController } from '../../drawControllers/svg.drawController.ts';
import type { Entity } from '../../entities/Entity';
import { getVisibleEntities } from '../../state';
import { getBoundingBoxOfMultipleEntities } from '../get-bounding-box-of-multiple-entities.ts';

/**
 * Shows a message when there are no entities to export, since an empty drawing has no size
 * @returns true when there are entities to export
 */
export function hasEntitiesToExport(entities: Entity[]): boolean {
	if (!entities.length) {
		toast.info('Nothing to export');
		return false;
	}
	return true;
}

export function convertEntitiesToSvgString(entities: Entity[]): {
	svgLines: string[];
	width: number;
	height: number;
} {
	const boundingBox = getBoundingBoxOfMultipleEntities(entities);

	const svgDrawController = new SvgDrawController(
		boundingBox.minX - SVG_MARGIN,
		boundingBox.minY - SVG_MARGIN,
		boundingBox.maxX + SVG_MARGIN,
		boundingBox.maxY + SVG_MARGIN
	);

	for (const entity of entities) {
		entity.draw(svgDrawController);
	}

	return svgDrawController.export();
}

export function exportEntitiesToSvgFile() {
	const entities = getVisibleEntities();
	if (!hasEntitiesToExport(entities)) {
		return;
	}

	const svg = convertEntitiesToSvgString(entities);

	const blob = new Blob(svg.svgLines, { type: 'image/svg+xml;charset=utf-8' });
	saveAs(blob, 'open-web-cad--drawing.svg');
}
