import {Point} from '@flatten-js/core';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Actor, type MachineSnapshot} from 'xstate';
import {HIGHLIGHT_ENTITY_DISTANCE, SNAP_POINT_DISTANCE, TOOLBAR_WIDTH} from './App.consts';
import App from './App.tsx';
import {ScreenCanvasDrawController} from './drawControllers/screenCanvas.drawController';
import {draw} from './helpers/draw';
import {findClosestEntity} from './helpers/find-closest-entity';
import {getNewLayer} from './helpers/get-new-layer.ts';
import type {JsonDrawingFileDeserialized} from './helpers/import-export-handlers/export-entities-to-json.ts';
import {getEntitiesAndLayersFromLocalStorage} from './helpers/import-export-handlers/import-entities-from-local-storage.ts';
import {trackHoveredSnapPoint} from './helpers/track-hovered-snap-points';
import {InputController} from './inputController/input-controller.ts';
import {
	getActiveToolActor,
	getCanvas,
	getEntities,
	getHoveredSnapPoints,
	getLastDrawTimestamp,
	getScreenCanvasDrawController,
	getSnapPoint,
	setActiveLayerId,
	setActiveToolActor,
	setCanvas,
	setEntities,
	setHighlightedEntityIds,
	setHoveredSnapPoints,
	setInputController,
	setLastDrawTimestamp,
	setLayers,
	setScreenCanvasDrawController,
} from './state';
import {Tool} from './tools';
import {TOOL_STATE_MACHINES} from './tools/tool.consts';
import {ActorEvent, type DrawEvent} from './tools/tool.types';

ReactDOM.createRoot(document.getElementById('root') as HTMLDivElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

function startDrawLoop(
	screenCanvasDrawController: ScreenCanvasDrawController,
	timestamp: DOMHighResTimeStamp
) {
	const lastDrawTimestamp = getLastDrawTimestamp();

	const elapsedTime = timestamp - lastDrawTimestamp;
	setLastDrawTimestamp(timestamp);

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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

	/**
	 * Highlight the entity closest to the mouse when the select tool is active
	 */
	if (getActiveToolActor()?.getSnapshot()?.context?.type === Tool.SELECT) {
		const screenCanvasDrawController = getScreenCanvasDrawController();
		if (!screenCanvasDrawController) {
			throw new Error('getScreenCanvasDrawController() returned null');
		}
		const { distance, entity: closestEntity } = findClosestEntity(
			screenCanvasDrawController.getWorldMouseLocation(),
			getEntities()
		);

		if (distance < HIGHLIGHT_ENTITY_DISTANCE) {
			setHighlightedEntityIds([closestEntity.id]);
		}
	}

	/**
	 * Track hovered snap points
	 */
	trackHoveredSnapPoint(
		getSnapPoint(),
		getHoveredSnapPoints(),
		setHoveredSnapPoints,
		SNAP_POINT_DISTANCE / screenCanvasDrawController.getScreenScale(),
		elapsedTime
	);

	/**
	 * Draw everything on the canvas
	 */
	draw(screenCanvasDrawController);

	requestAnimationFrame((newTimestamp: DOMHighResTimeStamp) => {
		startDrawLoop(screenCanvasDrawController, newTimestamp);
	});
}

function handleWindowResize() {
	getScreenCanvasDrawController().setCanvasSize(new Point(window.innerWidth, window.innerHeight));
	const canvas = getCanvas();
	if (canvas) {
		canvas.width = window.innerWidth - TOOLBAR_WIDTH;
		canvas.height = window.innerHeight;
	}
}

function initApplication() {
	const canvas = document.getElementsByTagName('canvas')[0] as HTMLCanvasElement | null;
	if (canvas) {
		setCanvas(canvas);

		const context = canvas.getContext('2d');
		if (!context) return;

		setEntities([], true); // Creates the first undo entry

		// Load the last drawing from local storage
		getEntitiesAndLayersFromLocalStorage().then((file: JsonDrawingFileDeserialized) => {
			setEntities(file.entities, true);
			let layers = file.layers;
			if (layers.length === 0) {
				layers = [getNewLayer()];
			}
			setLayers(layers);
			setActiveLayerId(layers[0].id);
		});
		const screenCanvasDrawController = new ScreenCanvasDrawController(context);
		setScreenCanvasDrawController(screenCanvasDrawController);

		window.addEventListener('resize', handleWindowResize);
		const inputController = new InputController();
		setInputController(inputController);

		handleWindowResize();

		startDrawLoop(screenCanvasDrawController, 0);

		const lineToolActor = new Actor(TOOL_STATE_MACHINES[Tool.LINE]);
		lineToolActor.start();
		setActiveToolActor(lineToolActor);
	}
}

document.addEventListener('DOMContentLoaded', () => {
	initApplication();
});
