import {Entity} from '../../entities/Entity';
import {CircleEntity} from '../../entities/CircleEntity';
import {LineEntity} from '../../entities/LineEntity';
import {
	RectangleEntity,
} from '../../entities/RectangleEntity';
import {getEntities, setEntities} from '../../state';


import {parse, Node} from 'svg-parser';
import {Point} from "@flatten-js/core";
import {svgPathToSegments} from "../convert-svg-path-to-line-segments.ts";

function handleSvgChildren(entities: Entity[], root: Node): void {
	const childrenToProcess: (string | Node)[] = [root];
	while(childrenToProcess[0]) {
		const child = childrenToProcess[0];
		if (typeof child === "string") {
			continue; // Don't import text // TODO convert this text to a TextEntity
		}
		if (child.type === 'element') {
			if (child.tagName === 'rect') {
				entities.push(new RectangleEntity(
					new Point(parseFloat(String(child.properties?.x)), parseFloat(String(child.properties?.y))),
					new Point(parseFloat(String(child.properties?.width)), parseFloat(String(child.properties?.height)))
				));
			}
			if (child.tagName === 'ellipse' && child.properties?.rx === child.properties?.ry) {
				entities.push(new CircleEntity(
					new Point(parseFloat(String(child.properties?.cx)), parseFloat(String(child.properties?.cy))),
					parseFloat(String(child.properties?.rx))
				));
			}
			if (child.tagName === 'path' && typeof child.properties?.d === 'string') {
					const lines = svgPathToSegments(child.properties.d);
					for (const line of lines) {
						entities.push(new LineEntity(new Point(line.x1, line.y1), new Point(line.x2, line.y2)));
					}
				}
			if (child.tagName === 'polygon' && typeof child.properties?.points === 'string') {
				const points: number[] = child.properties.points.split(' ').map(coord => parseFloat(coord));
				for (let i = 0; i < points.length; i=i+2) {
					if (i < points.length + 4) {
						// still enough points, keep going
						const startPoint = new Point(points[i], points[i+1]);
						const endPoint = new Point(points[i+2], points[i + 3]);
						entities.push(new LineEntity(startPoint, endPoint));
					} else if (i === points.length + 2) {
						// last point, add line back to the start
						const startPoint = new Point(points[i], points[i+1]);
						const endPoint = new Point(points[0], points[1]);
						entities.push(new LineEntity(startPoint, endPoint));
					} else {
						// stop
						console.log('expected even number of points but got: ' + points.length);
					}
				}
			}

			childrenToProcess.push(...(child.children || []));
		}
		childrenToProcess.shift();
	}
}

/**
 * Open a file selection dialog to select *.svg files
 * Parse the SVG file
 * Generate entities from the XML data
 * Set the entities in the state
 */
export function importEntitiesFromSvgFile(file: File | null | undefined) {
	return new Promise<void>((resolve, reject) => {
		if (!file) return;

		const reader = new FileReader();
		reader.addEventListener('load', async () => {
			const svg = reader.result as string;

			const data = parse(svg);

			console.log(data);

			if (!data.children || !data.children?.[0]) {
				reject(new Error('Empty SVG file'));
			}

			const svgEntities: Entity[] = [];
			handleSvgChildren(svgEntities, data.children[0]);
			setEntities([...getEntities(), ...svgEntities]);
			resolve();
		});
		reader.readAsText(file, 'utf-8');
	});
}
