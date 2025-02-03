import { InputController } from '../../src/helpers/input-controller';
import {
    getCanvasSize,
    setActiveToolActor,
    setCanvasSize,
    setEntities,
    setInputController,
    setScreenCanvasDrawController,
} from '../../src/state';
import { Point } from '@flatten-js/core';
import { Actor } from 'xstate';
import { TOOL_STATE_MACHINES } from '../../src/tools/tool.consts';
import { Tool } from '../../src/tools';
import { ScreenCanvasDrawController } from '../mocks/drawControllers/screenCanvas.drawController';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './consts';

export function initApplication(): InputController {
    const inputController = new InputController();
    setInputController(inputController);
    setEntities([], true); // Creates the first undo entry
    setCanvasSize(new Point(CANVAS_WIDTH, CANVAS_HEIGHT));

    const lineToolActor = new Actor(TOOL_STATE_MACHINES[Tool.LINE]);
    lineToolActor.start();
    setActiveToolActor(lineToolActor);
    setScreenCanvasDrawController(
        new ScreenCanvasDrawController(null, getCanvasSize()) as any,
    );
    return inputController;
}
