import { Point } from '@flatten-js/core';

export enum ActionType {
  Click = 'Click',
  TypedCommand = 'TypedCommand',
  ActivateTool = 'ActivateTool',
}

export interface ClickEvent {
  worldClickPoint: Point;
  holdingCtrl: boolean;
  holdingShift: boolean;
}

export interface TypedCommandEvent {
  text: string;
}

export interface ToolHandler {
  handleToolActivate(): void;
  handleToolClick(
    worldClickPoint: Point,
    holdingCtrl: boolean,
    holdingShift: boolean,
  ): void;
  handleToolTypedCommand(command: string): void;
}
