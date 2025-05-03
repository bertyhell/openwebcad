import {Point} from '@flatten-js/core';
import {Actor} from 'xstate';
import type {ScreenCanvasDrawController} from '../../src/drawControllers/screenCanvas.drawController';
import {InputController} from '../../src/inputController/input-controller';
import {setActiveToolActor, setEntities, setInputController, setScreenCanvasDrawController,} from '../../src/state';
import {Tool} from '../../src/tools';
import {TOOL_STATE_MACHINES} from '../../src/tools/tool.consts';
import {ScreenCanvasDrawController as ScreenCanvasDrawControllerMock} from '../mocks/drawControllers/screenCanvas.drawController';
import {CANVAS_HEIGHT, CANVAS_WIDTH} from './tests.consts';

export function initApplication(): InputController {
	const inputController = new InputController();
	setInputController(inputController);
	setEntities([], true); // Creates the first undo entry

	const canvasSize = new Point(CANVAS_WIDTH, CANVAS_HEIGHT);

	const lineToolActor = new Actor(TOOL_STATE_MACHINES[Tool.LINE]);
	lineToolActor.start();
	setActiveToolActor(lineToolActor);
	setScreenCanvasDrawController(
		new ScreenCanvasDrawControllerMock(null, canvasSize) as unknown as ScreenCanvasDrawController
	);
	return inputController;
}
