import { saveAs } from 'file-saver';
import { Entity } from '../../entities/Entity';
import { Point } from '@flatten-js/core';
import { SVG_MARGIN } from '../../App.consts';
import { getEntities } from '../../state';
import { SvgDrawController } from '../../drawControllers/svg.drawController.ts';
import {getBoundingBoxOfMultipleEntities} from "../get-bounding-box-of-multiple-entities.ts";

export function convertEntitiesToSvgString(
  entities: Entity[],
): { svgLines: string[]; width: number; height: number } {
  const boundingBox = getBoundingBoxOfMultipleEntities(entities);

  const svgDrawController = new SvgDrawController(
      boundingBox.minX - SVG_MARGIN,
      boundingBox.minY - SVG_MARGIN,
      boundingBox.maxX + SVG_MARGIN,
      boundingBox.maxY + SVG_MARGIN,
  );
  svgDrawController.setScreenOffset(
    new Point(SVG_MARGIN, SVG_MARGIN),
  );

  entities.forEach(entity => {
    entity.draw(svgDrawController);
  });

  return svgDrawController.export();
}

export function exportEntitiesToSvgFile() {
  const entities = getEntities();

  const svg = convertEntitiesToSvgString(entities);

  const blob = new Blob(svg.svgLines, { type: 'text/svg;charset=utf-8' });
  saveAs(blob, 'open-web-cad--drawing.svg');
}
