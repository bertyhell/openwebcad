import { Point } from '@flatten-js/core';
import { DrawInfo } from '../App.types.ts';
import { Tool } from '../tools.ts';
import { EventObject } from 'xstate';

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

export interface DrawEvent extends EventObject {
  type: ActorEvent.DRAW;
  drawInfo: DrawInfo;
}

export type StateEvent =
  | MouseClickEvent
  | KeyboardEscEvent
  | KeyboardEnterEvent
  | KeyboardDeleteEvent
  | DrawEvent;

export interface ToolContext {
  type: Tool;
}
