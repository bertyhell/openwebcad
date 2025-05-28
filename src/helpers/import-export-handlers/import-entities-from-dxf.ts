import {Point} from '@flatten-js/core';
import type {Entities as DxfEntities, Helper} from 'dxf';
import {isNil, uniqBy} from 'es-toolkit';
import {toast} from 'react-toastify';
import {CircleEntity} from '../../entities/CircleEntity.ts';
import type {Entity} from '../../entities/Entity.ts';
import {LineEntity} from '../../entities/LineEntity.ts';
import {getActiveLayerId, getActiveLineColor, getActiveLineWidth, getEntities, setEntities,} from '../../state';
import {toHex} from '../rgb-to-hex-color.ts';

function getDxfLineColor(dxfColor: [number, number, number] | undefined): string {
	if (isNil(dxfColor)) {
		return getActiveLineColor();
	}
	return toHex(dxfColor[0], dxfColor[1], dxfColor[2], 1);
}

/**
 * Imports entities from a DXF file.
 * @param file - The DXF file to import.
 */
export const importEntitiesFromDxfFile = async (file?: File): Promise<void> => {
	if (!file) {
		toast.warn('No DXF file selected.');
		return;
	}

	console.log(`Attempting to import DXF file: ${file.name}`);
	const reader = new FileReader();

	reader.onload = async (event) => {
		if (!event.target?.result) {
			toast.error('Failed to read DXF file content.');
			console.error('FileReader event.target.result is null or undefined.');
			return;
		}

		const fileContent = event.target.result as string;

		try {
			console.log('DXF file content loaded, attempting to parse...');
			// Dynamically import the dxf library
			const dxf = await import('dxf');
			const parsedDxf = new dxf.Helper(fileContent) as Helper;

			if (!parsedDxf || !parsedDxf.denormalised) {
				toast.error('Failed to parse DXF file. No entities found or invalid format.');
				console.error('Parsed DXF data is invalid or contains no entities:', parsedDxf);
				return;
			}

			console.log(`Successfully parsed DXF. Found ${parsedDxf.denormalised.length} entities.`);
			const newEntities: Entity[] = [];
			const currentLayerId = getActiveLayerId();
			const defaultWidth = getActiveLineWidth();

			for (const entity of parsedDxf.denormalised) {
				// TODO: Coordinate transformation for Y-axis (DXF Y is usually up, canvas Y is down)
				// For now, we assume positive Y is down for simplicity matching canvas.
				// If DXF typically has Y up, then Y coordinates from DXF might need to be negated or subtracted from canvas height.
				if (entity.type === 'LINE') {
					const dxfLine = entity as DxfEntities.Line;
					if (dxfLine.start && dxfLine.end) {
						const startPoint: Point = new Point(dxfLine.start.x, dxfLine.start.y);
						const endPoint: Point = new Point(dxfLine.end.x, dxfLine.end.y);
						const line = new LineEntity(currentLayerId, startPoint, endPoint);
						line.lineColor = getDxfLineColor(dxfLine.colorNumber);
						line.lineWidth = dxfLine.thickness || defaultWidth;
						line.lineDash = undefined;
						newEntities.push(line);
					} else {
						console.warn('Skipping DXF LINE due to missing or insufficient vertices:', dxfLine);
					}
				} else if (entity.type === 'CIRCLE') {
					const dxfCircle = entity as DxfEntities.Circle;
					if (dxfCircle.x && dxfCircle.y && dxfCircle.r) {
						const centerPoint = new Point(dxfCircle.x, dxfCircle.y);
						const circle = new CircleEntity(currentLayerId, centerPoint, dxfCircle.r);
						circle.lineColor = getDxfLineColor(dxfCircle.colorNumber);
						circle.lineWidth = defaultWidth;
						circle.lineDash = undefined;
						newEntities.push(circle);
					} else {
						console.warn('Skipping DXF CIRCLE due to missing center or radius:', dxfCircle);
					}
				} else {
					console.log(`Unsupported DXF type: ${entity.type}. Skipping.`);
				}
			}

			if (newEntities.length > 0) {
				const uniqueEntities = uniqBy(
					newEntities,
					(entity) =>
						`${JSON.stringify(entity.getShape())}|${entity.lineColor}|${entity.lineWidth}|${entity.lineDash}`
				);
				setEntities([...getEntities(), ...uniqueEntities]);
				toast.success(`${uniqueEntities.length} entities imported successfully from DXF!`);
			} else {
				toast.info('No supported entities found in the DXF file.');
			}
		} catch (error) {
			console.error('Error parsing DXF file:', error);
			toast.error('An error occurred while parsing the DXF file. See console for details.');
		}
	};

	reader.onerror = () => {
		console.error('FileReader error:', reader.error);
		toast.error('Failed to read the DXF file.');
	};

	reader.readAsText(file);
};
