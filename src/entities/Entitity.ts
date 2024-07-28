import { DrawInfo } from '../App.types.ts';
import { Box, Shape } from '@flatten-js/core';

export interface Entity {
  isSelected: boolean;
  draw(drawInfo: DrawInfo): void;
  getBoundingBox(): Box | null;
  intersectsWithBox(box: Box): boolean;
  isContainedInBox(box: Box): boolean;
  getShape(): Shape | null;
  getSvgString(): string | null;
}
