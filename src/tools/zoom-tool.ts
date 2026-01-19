import type { Point } from '@flatten-js/core';
import { assign, createMachine } from 'xstate';
import {
	setAngleGuideOriginPoint,
	setGhostHelperEntities,
	setShouldDrawHelpers,
} from '../state';
import type { StateEvent, TextInputEvent } from './tool.types';
import { zoomIn, zoomOut, zoomRectangle, zoomToBounds, zoomToScale } from './zoom-tool.helpers.ts';

type ZoomContext = {
	zoomMode: ZoomMode | null;

	// Amount to zoom to
	amount: string;

	// Rectangle to zoom to
	firstPoint: Point | null;
	lastPoint: Point | null;
};

enum ZoomMode {
	ALL = 'ALL',
	ABSOLUTE = 'ABSOLUTE',
	RECTANGLE = 'RECTANGLE',
	IN = 'IN',
	OUT = 'OUT',
}

export enum ZoomState {
	INIT = 'INIT',
	WAIT_FOR_INPUT = 'WAIT_FOR_INPUT',
	CHECK_INPUT = 'CHECK_INPUT',
}

export enum ZoomAction {
	INIT_ZOOM_TOOL = 'INIT_ZOOM_TOOL',
	EXECUTE_ZOOM = 'EXECUTE_ZOOM',
}

/**
 * Zoom tool state machine
 * This state machine is responsible for zooming the screen to a certain zoom level
 * - Users can enter a desired zoom level (absolute)
 * - Or zoom in or out (relative)
 * - Or zoom to the bounds of their drawing
 */
export const zoomToolStateMachine = createMachine(
	{
		types: {} as {
			context: ZoomContext;
			events: StateEvent;
		},
		context: {
			zoomMode: null,
			amount: '',
			firstPoint: null,
			lastPoint: null,
		},
		initial: ZoomState.INIT,
		states: {
			[ZoomState.INIT]: {
				description: 'Initializing the zoom tool',
				always: {
					actions: assign(() => {
						return {
							zoomMode: null,
							amount: '',
							firstPoint: null,
							lastPoint: null,
						};
					}),
					target: ZoomState.WAIT_FOR_INPUT,
				},
			},
			[ZoomState.WAIT_FOR_INPUT]: {
				description: 'Wait for user input to choose the desired zoom level',
				meta: {
					instructions:
						'Enter zoom level in percentage, or [A]ll for zooming to bounds, [I]n for zooming in, [O]ut for zooming out, or select a rectangle to zoom to',
				},
				on: {
					TEXT_INPUT: {
						actions: assign(({ event, context }) => {
							const inputValue = (event as TextInputEvent).value;
							if (inputValue === 'A') {
								return {
									zoomMode: ZoomMode.ALL,
									amount: '',
								};
							}
							if (inputValue === 'I') {
								return {
									zoomMode: ZoomMode.IN,
									amount: '',
								};
							}
							if (inputValue === 'O') {
								return {
									zoomMode: ZoomMode.OUT,
									amount: '',
								};
							}
							if (/[0-9.]/.test(inputValue)) {
								// Number
								return {
									zoomMode: ZoomMode.ABSOLUTE,
									amount: context.amount + inputValue,
								};
							}
							return context;
						}),
						target: ZoomState.CHECK_INPUT,
					},
					MOUSE_CLICK: {
						actions: assign(({ event, context }) => {
							if (!context.firstPoint) {
								return {
									...context,
									zoomMode: ZoomMode.RECTANGLE,
									amount: '',
									firstPoint: event.worldMouseLocation,
								};
							} else {
								return {
									...context,
									zoomMode: ZoomMode.RECTANGLE,
									amount: '',
									lastPoint: event.worldMouseLocation,
								};
							}
						}),
					},
					ENTER: {
						actions: ZoomAction.EXECUTE_ZOOM,
						target: ZoomState.INIT,
					},
					ESC: {
						actions: assign(() => {
							return {
								ZoomMode: null,
								amount: '',
							};
						}),
						target: ZoomState.INIT,
					},
				},
			},
			[ZoomState.CHECK_INPUT]: {
				description:
					'Check if we have enough to execute the zoom, or we need to wait for more  input',
				always: [
					{
						guard: ({ context }) => {
							return (
								!!context.zoomMode &&
								[ZoomMode.ALL, ZoomMode.IN, ZoomMode.OUT].includes(context.zoomMode)
							);
						},
						actions: ZoomAction.EXECUTE_ZOOM,
						target: ZoomState.INIT,
					},
					{
						guard: ({ context }) => {
							return (
								context.zoomMode === ZoomMode.RECTANGLE &&
								!!context.firstPoint &&
								!!context.lastPoint
							);
						},
						actions: ZoomAction.EXECUTE_ZOOM,
						target: ZoomState.INIT,
					},
					{
						guard: ({ context }) => {
							return context.zoomMode === ZoomMode.ABSOLUTE && !!context.amount;
						},
						actions: ZoomAction.EXECUTE_ZOOM,
						target: ZoomState.INIT,
					},
					{
						target: ZoomState.WAIT_FOR_INPUT,
					},
				],
			},
		},
	},
	{
		actions: {
			[ZoomAction.INIT_ZOOM_TOOL]: () => {
				setShouldDrawHelpers(false);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
			},
			[ZoomAction.EXECUTE_ZOOM]: assign(({ context }) => {
				switch (context.zoomMode) {
					case ZoomMode.ALL:
						zoomToBounds();
						break;
					case ZoomMode.IN:
						zoomIn();
						break;
					case ZoomMode.OUT:
						zoomOut();
						break;
					case ZoomMode.ABSOLUTE: {
						const newScreenScale = parseFloat(context.amount) / 100;
						zoomToScale(newScreenScale);
						break;
					}
					case ZoomMode.RECTANGLE: {
						if (context.firstPoint && context.lastPoint) {
							zoomRectangle(context.firstPoint, context.lastPoint);
						}
						break;
					}
					default:
					// do nothing
				}
				return {
					...context,
				};
			}),
		},
	}
);
