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
  worldMouseLocation: Point;
  holdingCtrl: boolean;
  holdingShift: boolean;
}

export interface TypedCommandEvent {
  text: string;
}

export interface ToolHandler {
  handleToolActivate(): void;
  handleToolClick(
    worldMouseLocation: Point,
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
  NUMBER_INPUT = 'NUMBER_INPUT',
  TEXT_INPUT = 'TEXT_INPUT',
  ABSOLUTE_POINT_INPUT = 'ABSOLUTE_POINT_INPUT',
  RELATIVE_POINT_INPUT = 'RELATIVE_POINT_INPUT',
}

export interface MouseClickEvent extends EventObject {
  type: ActorEvent.MOUSE_CLICK;
  worldMouseLocation: Point;
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

export interface NumberInputEvent extends EventObject {
  type: ActorEvent.NUMBER_INPUT;
  value: number;
  worldMouseLocation: Point;
}

export interface TextInputEvent extends EventObject {
  type: ActorEvent.TEXT_INPUT;
  value: string;
}

export interface AbsolutePointInputEvent extends EventObject {
  type: ActorEvent.ABSOLUTE_POINT_INPUT;
  value: Point;
}

export interface RelativePointInputEvent extends EventObject {
  type: ActorEvent.RELATIVE_POINT_INPUT;
  value: Point;
}

export interface FileSelectedEvent extends EventObject {
  type: ActorEvent.FILE_SELECTED;
  image: HTMLImageElement;
}

export interface DrawEvent extends EventObject {
  type: ActorEvent.DRAW;
  drawController: ScreenCanvasDrawController;
}

export type PointInputEvent =
  | MouseClickEvent
  | NumberInputEvent
  | AbsolutePointInputEvent
  | RelativePointInputEvent;

export type StateEvent =
  | MouseClickEvent
  | KeyboardEscEvent
  | KeyboardEnterEvent
  | KeyboardDeleteEvent
  | NumberInputEvent
  | TextInputEvent
  | AbsolutePointInputEvent
  | RelativePointInputEvent
  | FileSelectedEvent
  | DrawEvent;

export interface ToolContext {
  type: Tool;
}
