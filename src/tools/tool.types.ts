import { Point } from '@flatten-js/core';
import { DrawInfo } from '../App.types.ts';

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

export enum ActorEvent {
  MOUSE_CLICK = 'MOUSE_CLICK',
  ESC = 'ESC',
  DRAW = 'DRAW',
}

export interface MouseClickEvent {
  type: ActorEvent.MOUSE_CLICK;
  worldClickPoint: Point;
  holdingCtrl: boolean;
  holdingShift: boolean;
}

export interface KeyboardEscEvent {
  type: ActorEvent.ESC;
}

export interface DrawEvent {
  type: ActorEvent.DRAW;
  drawInfo: DrawInfo;
}
