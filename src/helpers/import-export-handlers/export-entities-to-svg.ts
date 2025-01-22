import { saveAs } from 'file-saver';
import { Entity } from '../../entities/Entity';
import { Point } from '@flatten-js/core';
import { SVG_MARGIN } from '../../App.consts';
import { getCanvasSize, getEntities } from '../../state';
import { SvgDrawController } from '../../drawControllers/svg.drawController.ts';

export function convertEntitiesToSvgString(
  entities: Entity[],
  canvasSize: Point,
): { svgLines: string[]; width: number; height: number } {
  let boundingBoxMinX = canvasSize.x;
  let boundingBoxMinY = canvasSize.y;
  let boundingBoxMaxX = 0;
  let boundingBoxMaxY = 0;

  entities.forEach(entity => {
    const boundingBox = entity.getBoundingBox();
    if (boundingBox) {
      boundingBoxMinX = Math.min(boundingBoxMinX, boundingBox.xmin);
      boundingBoxMinY = Math.min(boundingBoxMinY, boundingBox.ymin);
      boundingBoxMaxX = Math.max(boundingBoxMaxX, boundingBox.xmax);
      boundingBoxMaxY = Math.max(boundingBoxMaxY, boundingBox.ymax);
    }
  });

  const svgDrawController = new SvgDrawController(
    boundingBoxMinX - SVG_MARGIN,
    boundingBoxMinY - SVG_MARGIN,
    boundingBoxMaxX + SVG_MARGIN,
    boundingBoxMaxY + SVG_MARGIN,
  );
  svgDrawController.setScreenOffset(
    new Point(boundingBoxMinX, boundingBoxMinY),
  );

  entities.forEach(entity => {
    entity.draw(svgDrawController);
  });

  return svgDrawController.export();
}

export function exportEntitiesToSvgFile() {
  const entities = getEntities();
  const canvasSize = getCanvasSize();

  const svg = convertEntitiesToSvgString(entities, canvasSize);

  const blob = new Blob(svg.svgLines, { type: 'text/svg;charset=utf-8' });
  saveAs(blob, 'open-web-cad--drawing.svg');
}
