import { DrawInfo, Shape, SnapPoint } from '../App.types.ts';
import { Box, Point, Segment } from '@flatten-js/core';

export interface Entity {
  isHighlighted: boolean; // When the mouse is close and the tool is selection
  isSelected: boolean; // When the user selects the component
  draw(drawInfo: DrawInfo): void;
  getBoundingBox(): Box | null;
  intersectsWithBox(box: Box): boolean;
  isContainedInBox(box: Box): boolean;
  getFirstPoint(): Point | null;
  getShape(): Shape | null;
  getSnapPoints(): SnapPoint[];
  getIntersections(entity: Entity): Point[];
  distanceTo(shape: Shape): [number, Segment] | null;
  getSvgString(): string | null;
}
