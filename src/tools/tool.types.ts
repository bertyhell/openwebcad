import { Point } from '@flatten-js/core';
import { Tool } from '../tools';
import { EventObject } from 'xstate';
import { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController';

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
  ENTER = 'ENTER',
  DELETE = 'DELETE',
  DRAW = 'DRAW',
  FILE_SELECTED = 'FILE_SELECTED',
}

export interface MouseClickEvent extends EventObject {
  type: ActorEvent.MOUSE_CLICK;
  worldClickPoint: Point;
  holdingCtrl: boolean;
  holdingShift: boolean;
}

export interface KeyboardEscEvent extends EventObject {
  type: ActorEvent.ESC;
}

export interface KeyboardEnterEvent extends EventObject {
  type: ActorEvent.ENTER;
}

export interface KeyboardDeleteEvent extends EventObject {
  type: ActorEvent.DELETE;
}

export interface FileSelectedEvent extends EventObject {
  type: ActorEvent.FILE_SELECTED;
  image: HTMLImageElement;
}

export interface DrawEvent extends EventObject {
  type: ActorEvent.DRAW;
  drawController: ScreenCanvasDrawController;
}

export type StateEvent =
  | MouseClickEvent
  | KeyboardEscEvent
  | KeyboardEnterEvent
  | KeyboardDeleteEvent
  | FileSelectedEvent
  | DrawEvent;

export interface ToolContext {
  type: Tool;
}
