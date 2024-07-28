import { DrawInfo, Shape } from '../App.types.ts';
import { Box, Segment } from '@flatten-js/core';

export interface Entity {
  isHighlighted: boolean; // When the mouse is close and the tool is selection
  isSelected: boolean; // When the user selects the component
  draw(drawInfo: DrawInfo): void;
  getBoundingBox(): Box | null;
  intersectsWithBox(box: Box): boolean;
  isContainedInBox(box: Box): boolean;
  getShape(): Shape | null;
  distanceTo(shape: Shape): [number, Segment] | null;
  getSvgString(): string | null;
}
