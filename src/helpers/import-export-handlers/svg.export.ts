import {saveAs} from 'file-saver';
import {SVG_MARGIN} from '../../App.consts';
import {SvgDrawController} from '../../drawControllers/svg.drawController.ts';
import type {Entity} from '../../entities/Entity';
import {getEntities} from '../../state';
import {getBoundingBoxOfMultipleEntities} from '../get-bounding-box-of-multiple-entities.ts';

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
	const entities = getEntities();

	const svg = convertEntitiesToSvgString(entities);

	const blob = new Blob(svg.svgLines, { type: 'text/svg;charset=utf-8' });
	saveAs(blob, 'open-web-cad--drawing.svg');
}
