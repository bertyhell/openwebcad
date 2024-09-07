import { Tool } from '../../tools.ts';
import { ToolHandler } from './tool.types.ts';
import { moveToolHandler } from './move-tool.ts';
import { eraseToolHandler } from './eraser-tool.ts';
import { lineToolHandler } from './line-tool.ts';
import { rectangleToolHandler } from './rectangle-tool.ts';
import { circleToolHandler } from './circle-tool.ts';
import { selectToolHandler } from './select-tool.ts';

export const toolHandlers: Record<Tool, ToolHandler> = {
  [Tool.Move]: moveToolHandler,
  [Tool.Eraser]: eraseToolHandler,
  [Tool.Line]: lineToolHandler,
  [Tool.Rectangle]: rectangleToolHandler,
  [Tool.Circle]: circleToolHandler,
  [Tool.Select]: selectToolHandler,
};
