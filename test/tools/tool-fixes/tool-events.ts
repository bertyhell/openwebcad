import { Point } from '@flatten-js/core';
import type { ScreenCanvasDrawController } from '../../../src/drawControllers/screenCanvas.drawController';
import { getActiveToolActor, getLastStateInstructions } from '../../../src/state';
import { ActorEvent } from '../../../src/tools/tool.types';

/**
 * Small helpers to drive the active tool with the same events the input controller sends
 */

export function click(x: number, y: number) {
	const worldMouseLocation = new Point(x, y);
	getActiveToolActor()?.send({
		type: ActorEvent.MOUSE_CLICK,
		worldMouseLocation,
		screenMouseLocation: worldMouseLocation,
		holdingCtrl: false,
		holdingShift: false,
	});
}

export function typePoint(x: number, y: number) {
	getActiveToolActor()?.send({ type: ActorEvent.ABSOLUTE_POINT_INPUT, value: new Point(x, y) });
}

export function typeRelativePoint(x: number, y: number) {
	getActiveToolActor()?.send({ type: ActorEvent.RELATIVE_POINT_INPUT, value: new Point(x, y) });
}

/**
 * A typed number, the mouse location gives the direction for a distance
 */
export function typeNumber(value: number, mouseLocation = new Point(1000, 0)) {
	getActiveToolActor()?.send({
		type: ActorEvent.NUMBER_INPUT,
		value,
		worldMouseLocation: mouseLocation,
	});
}

export function typeText(value: string) {
	getActiveToolActor()?.send({ type: ActorEvent.TEXT_INPUT, value });
}

export function pressEnter() {
	getActiveToolActor()?.send({ type: ActorEvent.ENTER });
}

export function moveMouse(x: number, y: number) {
	const mouseLocation = new Point(x, y);
	getActiveToolActor()?.send({
		type: ActorEvent.DRAW,
		drawController: {
			getWorldMouseLocation: () => mouseLocation,
		} as unknown as ScreenCanvasDrawController,
	});
}

export function getToolState() {
	return getActiveToolActor()?.getSnapshot().value;
}

export function getToolContext() {
	return getActiveToolActor()?.getSnapshot().context;
}

export function getInstructions() {
	return getLastStateInstructions();
}
