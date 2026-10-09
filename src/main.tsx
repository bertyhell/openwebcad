import { Point } from '@flatten-js/core';
import { debounce } from 'es-toolkit';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Actor, type MachineSnapshot } from 'xstate';
import { AUTOSAVE_DELAY, HOVERED_SNAP_POINT_TIME, SNAP_POINT_DISTANCE } from './App.consts';
import App from './App.tsx';
import { HtmlEvent } from './App.types.ts';
import { ScreenCanvasDrawController } from './drawControllers/screenCanvas.drawController';
import { draw } from './helpers/draw';
import { getNewLayer } from './helpers/get-new-layer.ts';
import type { JsonDrawingFileDeserialized } from './helpers/import-export-handlers/json.types.ts';
import { localStorageExport } from './helpers/import-export-handlers/local-storage.export.ts';
import { getEntitiesAndLayersFromLocalStorage } from './helpers/import-export-handlers/local-storage.import.ts';
import { trackHoveredSnapPoint } from './helpers/track-hovered-snap-points';
import { InputController } from './inputController/input-controller.ts';
import {
	clearRedrawRequest,
	getActiveToolActor,
	getCanvas,
	getHoveredSnapPoints,
	getIsRedrawRequested,
	getLastDrawTimestamp,
	getScreenCanvasDrawController,
	getSnapPoint,
	requestRedraw,
	resetUndoHistory,
	setActiveLayerId,
	setActiveToolActor,
	setCanvas,
	setEntities,
	setHoveredSnapPoints,
	setInputController,
	setLastDrawTimestamp,
	setLayers,
	setScreenCanvasDrawController,
} from './state';
import { Tool } from './tools';
import { TOOL_STATE_MACHINES } from './tools/tool.consts';
import { ActorEvent, type DrawEvent } from './tools/tool.types';

ReactDOM.createRoot(document.getElementById('root') as HTMLDivElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

/**
 * Redraw at least this often, as a safety net for changes that don't request a redraw, eg: an image that finished loading
 */
const MAX_TIME_BETWEEN_REDRAWS = 1000;

function startDrawLoop(
	screenCanvasDrawController: ScreenCanvasDrawController,
	timestamp: DOMHighResTimeStamp
) {
	const elapsedTime = timestamp - getLastDrawTimestamp();
	setLastDrawTimestamp(timestamp);

	/**
	 * Track hovered snap points, a snap point that is hovered long enough gets marked
	 */
	const wasMarked = isLastHoveredSnapPointMarked();
	trackHoveredSnapPoint(
		getSnapPoint(),
		getHoveredSnapPoints(),
		setHoveredSnapPoints,
		SNAP_POINT_DISTANCE / screenCanvasDrawController.getScreenScale(),
		elapsedTime
	);
	if (wasMarked !== isLastHoveredSnapPointMarked()) {
		requestRedraw();
	}

	timeSinceLastRedraw += elapsedTime;
	if (getIsRedrawRequested() || timeSinceLastRedraw > MAX_TIME_BETWEEN_REDRAWS) {
		timeSinceLastRedraw = 0;

		// Let the active tool update its preview, eg: the line that follows the mouse
		// biome-ignore lint/suspicious/noExplicitAny: snapshot of whichever tool is active
		const activeToolSnapshot: MachineSnapshot<any, any, any, any, any, any, any, any> | undefined =
			getActiveToolActor()?.getSnapshot();
		if (
			activeToolSnapshot?.status === 'active' &&
			activeToolSnapshot?.can({ type: ActorEvent.DRAW })
		) {
			getActiveToolActor()?.send({
				type: ActorEvent.DRAW,
				drawController: screenCanvasDrawController,
			} as DrawEvent);
		}

		draw(screenCanvasDrawController);

		// Changes made by the tool preview are drawn already
		clearRedrawRequest();
	}

	requestAnimationFrame((newTimestamp: DOMHighResTimeStamp) => {
		startDrawLoop(screenCanvasDrawController, newTimestamp);
	});
}

let timeSinceLastRedraw = 0;

function isLastHoveredSnapPointMarked(): boolean {
	return (getHoveredSnapPoints().at(-1)?.milliSecondsHovered ?? 0) > HOVERED_SNAP_POINT_TIME;
}

/**
 * The canvas fills the space next to the sidebar, so it resizes with the window and when the sidebar collapses
 * Keep the canvas resolution in sync with its size on screen
 */
let lastCanvasLeft: number | null = null;
function handleCanvasResize() {
	const canvas = getCanvas();
	if (!canvas) return;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	const pixelRatio = window.devicePixelRatio || 1;
	canvas.width = Math.round(width * pixelRatio);
	canvas.height = Math.round(height * pixelRatio);
	getScreenCanvasDrawController().setCanvasSize(new Point(width, height));

	// Keep the drawing at the same place on the screen when the sidebar changes width
	const canvasLeft = canvas.getBoundingClientRect().left;
	if (lastCanvasLeft !== null && canvasLeft !== lastCanvasLeft) {
		getScreenCanvasDrawController().panScreen(lastCanvasLeft - canvasLeft, 0);
	}
	lastCanvasLeft = canvasLeft;
}

function initApplication() {
	const canvas = document.getElementsByTagName('canvas')[0] as HTMLCanvasElement | null;
	if (canvas) {
		setCanvas(canvas);

		const context = canvas.getContext('2d');
		if (!context) return;

		// Load the last drawing from local storage
		getEntitiesAndLayersFromLocalStorage().then((file: JsonDrawingFileDeserialized) => {
			let layers = file.layers;
			if (layers.length === 0) {
				layers = [getNewLayer([])];
			}
			setEntities(file.entities);
			setLayers(layers);
			setActiveLayerId(layers[0].id);
			resetUndoHistory();

			// Save every change automatically, only after loading, so an empty drawing never overwrites the saved one
			const autosave = debounce(() => localStorageExport(), AUTOSAVE_DELAY);
			window.addEventListener(HtmlEvent.DRAWING_CHANGED, autosave);
		});
		const screenCanvasDrawController = new ScreenCanvasDrawController(context);
		setScreenCanvasDrawController(screenCanvasDrawController);

		new ResizeObserver(handleCanvasResize).observe(canvas);
		// The device pixel ratio changes when moving the window to another screen
		window.addEventListener('resize', handleCanvasResize);
		const inputController = new InputController();
		setInputController(inputController);

		handleCanvasResize();

		startDrawLoop(screenCanvasDrawController, 0);

		const lineToolActor = new Actor(TOOL_STATE_MACHINES[Tool.LINE]);
		lineToolActor.start();
		setActiveToolActor(lineToolActor);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	initApplication();
});
