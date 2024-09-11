import { Tool } from '../tools.ts';
import { ToolHandler } from './tool.types.ts';
import { moveToolHandler } from './move-tool.ts';
import { eraseToolHandler } from './eraser-tool.ts';
import { rectangleToolHandler } from './rectangle-tool.ts';
import { circleToolHandler } from './circle-tool.ts';
import { selectToolHandler } from './select-tool.ts';
import { Actor } from 'xstate';
import { lineToolActor } from './line-tool.ts';

export const toolHandlers: Record<Tool, ToolHandler | null> = {
  [Tool.Move]: moveToolHandler,
  [Tool.Eraser]: eraseToolHandler,
  [Tool.Line]: null,
  [Tool.Rectangle]: rectangleToolHandler,
  [Tool.Circle]: circleToolHandler,
  [Tool.Select]: selectToolHandler,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toolActors: Record<Partial<Tool>, Actor<any>> = {
  [Tool.Line]: lineToolActor,
};
