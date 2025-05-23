import {toast} from 'react-toastify';
import {CircleEntity} from '../../entities/CircleEntity';
import type {Entity} from '../../entities/Entity';
import {LineEntity} from '../../entities/LineEntity';
import {RectangleEntity} from '../../entities/RectangleEntity';
import {getActiveLayerId, getEntities, setEntities} from '../../state';

import {Point} from '@flatten-js/core';
import {type Node, parse, type RootNode} from 'svg-parser';
import {svgPathToSegments} from '../convert-svg-path-to-line-segments.ts';
import {getBoundingBoxOfMultipleEntities} from '../get-bounding-box-of-multiple-entities.ts';
import {middle} from '../middle.ts';

function svgChildrenToEntities(root: RootNode): Entity[] {
	if (!root.children || !root.children?.[0]) {
		toast.error('Failed to load SVG file since it appears to be empty');
		console.error(new Error('Empty SVG file'));
		return [];
	}
	const entities: Entity[] = [];
	const childrenToProcess: (string | Node)[] = [root.children[0]];
	while (childrenToProcess[0]) {
		const child = childrenToProcess[0];
		if (typeof child === 'string') {
			continue; // Don't import text // TODO convert this text to a TextEntity
		}
		if (child.type === 'element') {
			if (child.tagName === 'rect') {
				const corner = new Point(
					Number.parseFloat(String(child.properties?.x)),
					Number.parseFloat(String(child.properties?.y))
				);
				entities.push(
					new RectangleEntity(
						getActiveLayerId(),
						corner,
						new Point(
							corner.x + Number.parseFloat(String(child.properties?.width)),
							corner.y + Number.parseFloat(String(child.properties?.height))
						)
					)
				);
			}
			if (child.tagName === 'ellipse') {
				if (child.properties?.rx === child.properties?.ry) {
					entities.push(
						new CircleEntity(
							getActiveLayerId(),
							new Point(
								Number.parseFloat(String(child.properties?.cx)),
								Number.parseFloat(String(child.properties?.cy))
							),
							Number.parseFloat(String(child.properties?.rx))
						)
					);
				} else {
					// TODO convert ellipse to line segments
				}
			}
			if (child.tagName === 'path' && typeof child.properties?.d === 'string') {
				const lines = svgPathToSegments(child.properties.d);
				for (const line of lines) {
					entities.push(
						new LineEntity(
							getActiveLayerId(),
							new Point(line.x1, line.y1),
							new Point(line.x2, line.y2)
						)
					);
				}
			}
			if (child.tagName === 'polygon' && typeof child.properties?.points === 'string') {
				const coords: number[] = child.properties.points
					.split(' ')
					.map((coord) => Number.parseFloat(coord));
				for (let i = 0; i <= coords.length; i = i + 2) {
					if (i + 4 <= coords.length) {
						// still enough points, keep going
						const startPoint = new Point(coords[i], coords[i + 1]);
						const endPoint = new Point(coords[i + 2], coords[i + 3]);
						entities.push(new LineEntity(getActiveLayerId(), startPoint, endPoint));
					} else if (i + 2 === coords.length) {
						// last point, add line back to the start
						const startPoint = new Point(coords[i], coords[i + 1]);
						const endPoint = new Point(coords[0], coords[1]);
						entities.push(new LineEntity(getActiveLayerId(), startPoint, endPoint));
					} else {
						// stop
						toast.error(
							`Error processing SVG polygon: expected an even number of points, but got ${coords.length}`
						);
						console.error(`expected even number of points but got: ${coords.length}`);
					}
				}
			}

			childrenToProcess.push(...(child.children || []));
		}
		childrenToProcess.shift();
	}
	return entities;
}

/**
 * Open a file selection dialog to select *.svg files
 * Parse the SVG file
 * Generate entities from the XML data
 * Set the entities in the state
 */
export function importEntitiesFromSvgFile(file: File | null | undefined) {
	return new Promise<void>((resolve) => {
		if (!file) return;

		const reader = new FileReader();
		reader.addEventListener('load', async () => {
			try {
				const svg = reader.result as string;

				const data = parse(svg);

				const svgEntities: Entity[] = svgChildrenToEntities(data);

				// We still need to flip the image top to bottom since the coordinate system of svg has a y-axis that goes down
				// And the world coordinate system of this application has a mathematical y-axis that goes up
				const boundingBox = getBoundingBoxOfMultipleEntities(svgEntities);
				const centerPoint = new Point(
					middle(boundingBox.minX, boundingBox.maxX),
					middle(boundingBox.minY, boundingBox.maxY)
				);

				const mirrorAxis = new LineEntity(
					getActiveLayerId(),
					centerPoint,
					new Point(centerPoint.x + 1, centerPoint.y)
				);
				for (const svgEntity of svgEntities) {
					svgEntity.mirror(mirrorAxis);
				}

				setEntities([...getEntities(), ...svgEntities]);
				resolve();
			} catch (error) {
				toast.error('Failed to load SVG file');
				console.error(error);
			}
		});
		reader.readAsText(file, 'utf-8');
	});
}
