import { saveAs } from 'file-saver';
import { Entity } from '../../entities/Entity';
import { Point, Vector } from '@flatten-js/core';
import { SVG_MARGIN } from '../../App.consts';
import { Shape } from '../../App.types';
import { getCanvasSize, getEntities } from '../../state';
import { getExportColor } from '../get-export-color';

export function convertEntitiesToSvgString(
  entities: Entity[],
  canvasSize: Point,
): { svgString: string; width: number; height: number } {
  let boundingBoxMinX = canvasSize.x;
  let boundingBoxMinY = canvasSize.y;
  let boundingBoxMaxX = 0;
  let boundingBoxMaxY = 0;
  const svgStrings: string[] = [];

  entities.forEach(entity => {
    const boundingBox = entity.getBoundingBox();
    if (boundingBox) {
      boundingBoxMinX = Math.min(boundingBoxMinX, boundingBox.xmin);
      boundingBoxMinY = Math.min(boundingBoxMinY, boundingBox.ymin);
      boundingBoxMaxX = Math.max(boundingBoxMaxX, boundingBox.xmax);
      boundingBoxMaxY = Math.max(boundingBoxMaxY, boundingBox.ymax);
    }
  });

  console.log('exporting svg', svgStrings);
  const boundingBoxWidth = boundingBoxMaxX - boundingBoxMinX + SVG_MARGIN * 2;
  const boundingBoxHeight = boundingBoxMaxY - boundingBoxMinY + SVG_MARGIN * 2;

  entities.forEach(entity => {
    const shape = entity.getShape();
    if (!shape) return;

    const translatedShape = shape.translate(
      new Vector(
        new Point(boundingBoxMinX, boundingBoxMinY),
        new Point(SVG_MARGIN, SVG_MARGIN),
      ),
    );
    const svgString = (translatedShape as Shape).svg({
      stroke: getExportColor(entity.lineColor),
      strokeWidth: entity.lineWidth,
    });
    if (svgString) {
      svgStrings.push(svgString);
    }
  });

  // Patch for bug: https://github.com/alexbol99/flatten-js/pull/186/files
  const svgString = `
      <svg width="${boundingBoxWidth}" height="${boundingBoxHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${boundingBoxWidth}" height="${boundingBoxHeight}" fill="white" />
        ${svgStrings.join('')}
      </svg>
    `;

  return {
    svgString,
    width: boundingBoxWidth,
    height: boundingBoxHeight,
  };
}

export function exportEntitiesToSvgFile() {
  const entities = getEntities();
  const canvasSize = getCanvasSize();

  const svg = convertEntitiesToSvgString(entities, canvasSize);

  const blob = new Blob([svg.svgString], { type: 'text/svg;charset=utf-8' });
  saveAs(blob, 'open-web-cad--drawing.svg');
}
