import { Tool } from '../tools.ts';
import { moveToolActor } from './move-tool.ts';
import { eraserToolActor } from './eraser-tool.ts';
import { rectangleToolActor } from './rectangle-tool.ts';
import { circleToolActor } from './circle-tool.ts';
import { selectToolActor } from './select-tool.ts';
import { Actor } from 'xstate';
import { lineToolActor } from './line-tool.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toolActors: Record<Partial<Tool>, Actor<any>> = {
  [Tool.Line]: lineToolActor,
  [Tool.Rectangle]: rectangleToolActor,
  [Tool.Circle]: circleToolActor,
  [Tool.Select]: selectToolActor,
  [Tool.Eraser]: eraserToolActor,
  [Tool.Move]: moveToolActor,
};
