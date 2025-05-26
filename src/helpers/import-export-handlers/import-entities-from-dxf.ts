import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import type { Point, LineEntity, CircleEntity, Entity } from '../../App.types';
import { EntityType } from '../../App.types';
import { getEntities, setEntities, getActiveLayerId, getActiveLineColor, getActiveLineWidth } from '../../state';

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
			const parser = new dxf.DxfParser();
			const parsedDxf = parser.parseSync(fileContent); // Use parseSync as parseString is not available in the version I expect

			if (!parsedDxf || !parsedDxf.entities) {
				toast.error('Failed to parse DXF file. No entities found or invalid format.');
				console.error('Parsed DXF data is invalid or contains no entities:', parsedDxf);
				return;
			}

			console.log(`Successfully parsed DXF. Found ${parsedDxf.entities.length} entities.`);
			const newEntities: Entity[] = [];
			const currentLayerId = getActiveLayerId();
			const defaultColor = getActiveLineColor();
			const defaultWidth = getActiveLineWidth();

			for (const entity of parsedDxf.entities) {
				// TODO: Coordinate transformation for Y-axis (DXF Y is usually up, canvas Y is down)
				// For now, we assume positive Y is down for simplicity matching canvas.
				// If DXF typically has Y up, then Y coordinates from DXF might need to be negated or subtracted from canvas height.
				if (entity.type === 'LINE') {
					if (entity.vertices && entity.vertices.length >= 2) {
						const startPoint: Point = { x: entity.vertices[0].x, y: entity.vertices[0].y };
						const endPoint: Point = { x: entity.vertices[1].x, y: entity.vertices[1].y };
						const line: LineEntity = {
							id: uuidv4(),
							type: EntityType.LINE,
							layerId: currentLayerId,
							start: startPoint,
							end: endPoint,
							color: (entity.colorNumber !== undefined && entity.colorNumber !== 256) ? `#${entity.colorNumber.toString(16).padStart(6, '0')}` : defaultColor, // TODO: Map DXF color index to HEX
							width: defaultWidth, // TODO: Potentially use layer lineweight or entity thickness
						};
						newEntities.push(line);
						console.log('Converted DXF LINE to LineEntity:', line);
					} else {
						console.warn('Skipping DXF LINE entity due to missing or insufficient vertices:', entity);
					}
				} else if (entity.type === 'CIRCLE') {
					if (entity.center && typeof entity.radius === 'number') {
						const centerPoint: Point = { x: entity.center.x, y: entity.center.y };
						const circle: CircleEntity = {
							id: uuidv4(),
							type: EntityType.CIRCLE,
							layerId: currentLayerId,
							center: centerPoint,
							radius: entity.radius,
							color: (entity.colorNumber !== undefined && entity.colorNumber !== 256) ? `#${entity.colorNumber.toString(16).padStart(6, '0')}` : defaultColor, // TODO: Map DXF color index to HEX
							width: defaultWidth, // TODO: Potentially use layer lineweight or entity thickness
						};
						newEntities.push(circle);
						console.log('Converted DXF CIRCLE to CircleEntity:', circle);
					} else {
						console.warn('Skipping DXF CIRCLE entity due to missing center or radius:', entity);
					}
				} else {
					console.log(`Unsupported DXF entity type: ${entity.type}. Skipping.`);
				}
			}

			if (newEntities.length > 0) {
				setEntities([...getEntities(), ...newEntities]);
				toast.success(`${newEntities.length} entities imported successfully from DXF!`);
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
