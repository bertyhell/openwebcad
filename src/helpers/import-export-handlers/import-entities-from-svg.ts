// import {JsonDrawingFile} from './export-entities-to-json';
// import {compact} from 'es-toolkit';
// import {Entity, EntityName, JsonEntity} from '../../entities/Entity';
// import {ArcEntity, ArcJsonData} from '../../entities/ArcEntity';
// import {CircleEntity, CircleJsonData} from '../../entities/CircleEntity';
// import {LineEntity, LineJsonData} from '../../entities/LineEntity';
// import {PointEntity, PointJsonData} from '../../entities/PointEntity';
// import {
// 	RectangleEntity,
// 	RectangleJsonData,
// } from '../../entities/RectangleEntity';
// import {setEntities} from '../../state';
//
// import {parse, Node} from 'svg-parser';
// import {SvgParseResult} from "./import-entities-from-svg.types.ts";
// import {Point} from "@flatten-js/core";
//
// function handleSvgChild(entities: Entity[], child: Node): void {
// 	if (child.type === 'element') {
// 		if (child.tagName === 'rect') {
// 			entities.push(new RectangleEntity(
// 				new Point(parseFloat(String(child.properties?.x)), parseFloat(String(child.properties?.y))),
// 				new Point(parseFloat(String(child.properties?.width)), parseFloat(String(child.properties?.height)))
// 			));
// 		}
// 		if (child.tagName === 'ellipse' && child.properties?.rx === child.properties?.ry) {
// 			entities.push(new CircleEntity(
// 				new Point(parseFloat(String(child.properties?.cx)), parseFloat(String(child.properties?.cy))),
// 				parseFloat(String(child.properties?.rx))
// 			));
// 		}
//
// 	}
// }
//
// /**
//  * Open a file selection dialog to select *.svg files
//  * Parse the SVG file
//  * Generate entities from the XML data
//  * Set the entities in the state
//  */
// export function importEntitiesFromSvgFile(file: File | null | undefined) {
// 	return new Promise<void>((resolve, reject) => {
// 		if (!file) return;
//
// 		const reader = new FileReader();
// 		reader.addEventListener('load', async () => {
// 			const svg = reader.result as string;
//
// 			const data = parse(svg);
//
// 			console.log(data);
//
// 			if (!data.children || !data.children?.[0]) {
// 				reject(new Error('Empty SVG file'));
// 			}
//
//
// 			setEntities(compact(await Promise.all(entityPromises)), true);
// 			resolve();
// 		});
// 		reader.readAsText(file, 'utf-8');
// 	});
// }
