import { Point } from '@flatten-js/core';
import { compact, round } from 'es-toolkit';
import { toast } from 'react-toastify';
import { Actor } from 'xstate';
import {
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR,
	CANVAS_INPUT_FIELD_HEIGHT,
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
	CANVAS_INPUT_FIELD_MOUSE_OFFSET,
	CANVAS_INPUT_FIELD_TEXT_COLOR,
	CANVAS_INPUT_FIELD_WIDTH,
	HIGHLIGHT_ENTITY_DISTANCE,
	SNAP_POINT_DISTANCE,
	TOOLBAR_WIDTH,
} from '../App.consts.ts';
import { HtmlEvent, MouseButton, SnapPointType } from '../App.types.ts';
import type { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController.ts';
import { calculateAngleGuidesAndSnapPoints } from '../helpers/calculate-angle-guides-and-snap-points.ts';
import { findClosestEntity } from '../helpers/find-closest-entity.ts';
import { getClosestSnapPointWithinRadius } from '../helpers/get-closest-snap-point.ts';
import { localStorageExport } from '../helpers/import-export-handlers/local-storage.export.ts';
import {
	getActiveToolActor,
	getCanvas,
	getEditableEntities,
	getGridSettings,
	getLastStateInstructions,
	getPanStartLocation,
	getScreenCanvasDrawController,
	getSelectedEntities,
	getShouldDrawHelpers,
	getSnapPoint,
	getSnapPointOnAngleGuide,
	redo,
	requestRedraw,
	setActiveToolActor,
	setGhostHelperEntities,
	setGridSettings,
	setHighlightedEntityIds,
	setPanStartLocation,
	setSelectedEntityIds,
	setShouldDrawCursor,
	undo,
} from '../state.ts';
import { TOOL_STATE_MACHINES } from '../tools/tool.consts.ts';
import {
	type AbsolutePointInputEvent,
	ActorEvent,
	type MouseClickEvent,
	type NumberInputEvent,
	type RelativePointInputEvent,
	type TextInputEvent,
} from '../tools/tool.types.ts';
import { zoomIn, zoomOut, zoomToBounds } from '../tools/zoom-tool.helpers.ts';
import { isZoomOption } from '../tools/zoom-tool.ts';
import { Tool } from '../tools.ts';
import { getToolNamesFromPrefixText, parseCommandInput } from './command-parser.ts';

/**
 * Distance between the left of the window and the left of the canvas
 * Falls back to the toolbar width when there is no canvas (eg: during unit tests)
 */
function getCanvasOffsetLeft(): number {
	return getCanvas()?.getBoundingClientRect().left ?? TOOLBAR_WIDTH;
}

/**
 * Keys typed into form fields, or used to activate a keyboard focused button, belong to that element instead of the canvas
 */
function shouldLetElementHandleKey(evt: KeyboardEvent): boolean {
	const target = evt.target as HTMLElement | null;
	if (!target?.closest) {
		return false;
	}
	if (target.closest('input, textarea, select, [contenteditable="true"]')) {
		return true;
	}
	const isActivationKey = evt.key === 'Enter' || evt.key === ' ';
	if (isActivationKey && target.closest('button, a') && target.matches(':focus-visible')) {
		return true;
	}
	return evt.key === 'Escape' && !!target.closest('[role="dialog"]');
}

/**
 * Whether the active tool is asking for text, eg: the label of a text or a zoom option
 */
function activeToolAcceptsTextInput(): boolean {
	const activeToolSnapshot = getActiveToolActor()?.getSnapshot();
	const activeToolState = activeToolSnapshot?.value;
	return !!activeToolSnapshot?.machine?.states?.[activeToolState]?.config?.on?.TEXT_INPUT;
}

/**
 * Single key options of the active tool's current state that are applied instantly, eg: [I]nvert in the arc tool
 */
function getActiveToolInstantOptions(): string[] {
	const activeToolSnapshot = getActiveToolActor()?.getSnapshot();
	const activeToolState = activeToolSnapshot?.value;
	return activeToolSnapshot?.machine?.states?.[activeToolState]?.config?.meta?.instantOptions ?? [];
}

/**
 * Whether the active tool also accepts a number in its current state, eg: the arc angle next to the [I]nvert option
 */
function activeToolAcceptsNumberInput(): boolean {
	const activeToolSnapshot = getActiveToolActor()?.getSnapshot();
	const activeToolState = activeToolSnapshot?.value;
	return !!activeToolSnapshot?.machine?.states?.[activeToolState]?.config?.on?.NUMBER_INPUT;
}

export class InputController {
	private text = '';

	/**
	 * Holding space lets the user pan with the left mouse button
	 */
	private isSpaceHeld = false;

	/**
	 * Text the user is typing in the input field next to the cursor
	 */
	public getText(): string {
		return this.text;
	}

	constructor() {
		if (typeof process === 'object' && process?.env?.NODE_ENV === 'test') {
			return; // used during unit testing
		}
		// Listen for keystrokes
		document.addEventListener('keydown', (evt) => {
			this.handleKeyStroke(evt);
		});
		document.addEventListener('keyup', (evt) => {
			if (evt.key === ' ') {
				this.setSpaceHeld(false);
			}
		});
		// Forget the space key when the window loses focus, since the keyup won't arrive
		window.addEventListener('blur', () => this.setSpaceHeld(false));
		// Listen for right mouse button click => perform the same action as ENTER
		const canvas = getCanvas();
		canvas?.addEventListener('mousedown', (evt: MouseEvent) => this.handleMouseDown(evt));
		canvas?.addEventListener('mousemove', (evt: MouseEvent) => this.handleMouseMove(evt));
		canvas?.addEventListener('mouseup', (evt: MouseEvent) => this.handleMouseUp(evt));
		canvas?.addEventListener('wheel', (evt: WheelEvent) => this.handleMouseWheel(evt));
		canvas?.addEventListener('mouseout', () => this.handleMouseOut());
		canvas?.addEventListener('mouseenter', () => this.handleMouseEnter());
		// Stop the context menu from appearing when right-clicking
		canvas?.addEventListener('contextmenu', (evt) => {
			evt.preventDefault();
		});
	}

	public draw(drawController: ScreenCanvasDrawController) {
		const screenMouseLocation = drawController.getScreenMouseLocation();

		// draw input field
		drawController.fillRectScreen(
			screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET,
			screenMouseLocation.y - CANVAS_INPUT_FIELD_MOUSE_OFFSET,
			CANVAS_INPUT_FIELD_WIDTH,
			CANVAS_INPUT_FIELD_HEIGHT,
			CANVAS_INPUT_FIELD_BACKGROUND_COLOR
		);
		// Draw text in input field
		if (this.text) {
			drawController.drawTextScreen(
				this.text,
				new Point(
					screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET + 2,
					screenMouseLocation.y - CANVAS_INPUT_FIELD_MOUSE_OFFSET - CANVAS_INPUT_FIELD_HEIGHT - 2
				),
				{
					textAlign: 'left',
					textColor: CANVAS_INPUT_FIELD_TEXT_COLOR,
					fontSize: 18,
				}
			);
		}

		const matchingToolNames = getToolNamesFromPrefixText(this.text);
		const toolInstruction = getLastStateInstructions();
		const texts: string[] = [];
		if (toolInstruction) {
			// Draw tool instruction
			texts.push(toolInstruction);
			const roundedX = round(drawController.getWorldMouseLocation().x, 2);
			const roundedY = round(drawController.getWorldMouseLocation().y, 2);
			texts.push(`${roundedX},${roundedY}`);
		}
		if (matchingToolNames.length) {
			// Draw list of matching tools. eg: C => CIRCLE, COPY, ...
			texts.push(...matchingToolNames);
		}
		this.drawListBelowInputField(drawController, texts);
	}

	public handleMouseUp(evt: MouseEvent) {
		if (evt.button === MouseButton.Right) {
			// Right click => confirm action (ENTER)
			evt.preventDefault();
			evt.stopPropagation();
			this.handleEnterKey();
		}

		// If ancestor parent exist with class .controls => ignore clicks, since a button was clicked instead of the canvas
		const controlsParent = (evt?.target as HTMLElement)?.closest('.controls');
		if (controlsParent) {
			return;
		}

		if (
			evt.button === MouseButton.Middle ||
			(evt.button === MouseButton.Left && getPanStartLocation())
		) {
			// Stop panning, a left click while panning with space is not a click on the drawing
			setPanStartLocation(null);
			return;
		}
		if (evt.button === MouseButton.Left) {
			const screenCanvasDrawController = getScreenCanvasDrawController();
			// A grid snap point is always used, it can be further away than the snap distance when zoomed out
			const gridSnapPoint = getSnapPoint()?.type === SnapPointType.Grid ? getSnapPoint() : null;
			const closestSnapPoint =
				gridSnapPoint ??
				getClosestSnapPointWithinRadius(
					compact([getSnapPoint(), getSnapPointOnAngleGuide()]),
					screenCanvasDrawController.getWorldMouseLocation(),
					SNAP_POINT_DISTANCE / screenCanvasDrawController.getScreenScale()
				);

			const worldMouseLocationTemp = getScreenCanvasDrawController().targetToWorld(
				new Point(
					evt.clientX - getCanvasOffsetLeft(),
					getScreenCanvasDrawController().getCanvasSize().y - evt.clientY
				)
			);
			const worldMouseLocation = closestSnapPoint ? closestSnapPoint.point : worldMouseLocationTemp;

			const activeToolActor = getActiveToolActor();
			activeToolActor?.send({
				type: ActorEvent.MOUSE_CLICK,
				worldMouseLocation,
				screenMouseLocation: screenCanvasDrawController.worldToTarget(worldMouseLocation),
				holdingCtrl: evt.ctrlKey || evt.metaKey,
				holdingShift: evt.shiftKey,
			} as MouseClickEvent);
		}
	}

	public handleMouseEnter() {
		setShouldDrawCursor(true);
	}

	public handleMouseMove(evt: MouseEvent) {
		setShouldDrawCursor(true);
		const screenCanvasDrawController = getScreenCanvasDrawController();
		const newScreenMouseLocation = new Point(
			evt.clientX - getCanvasOffsetLeft(),
			getScreenCanvasDrawController().getCanvasSize().y - evt.clientY
		);
		screenCanvasDrawController.setScreenMouseLocation(newScreenMouseLocation);

		// If the middle mouse button is pressed, pan the screen
		const panStartLocation = getPanStartLocation();
		if (panStartLocation) {
			screenCanvasDrawController.panScreen(
				newScreenMouseLocation.x - panStartLocation.x,
				newScreenMouseLocation.y - panStartLocation.y
			);
			setPanStartLocation(newScreenMouseLocation);
		}

		// Calculate angle guides and snap points
		calculateAngleGuidesAndSnapPoints();

		// Highlight the entity closest to the mouse when the select tool is active
		if (getActiveToolActor()?.getSnapshot()?.context.type === Tool.SELECT) {
			const closestEntityInfo = findClosestEntity(
				screenCanvasDrawController.targetToWorld(newScreenMouseLocation),
				getEditableEntities()
			);
			if (closestEntityInfo.distance < HIGHLIGHT_ENTITY_DISTANCE) {
				setHighlightedEntityIds([closestEntityInfo.entity.id]);
			} else {
				setHighlightedEntityIds([]);
			}
		}
	}

	public handleMouseOut() {
		setShouldDrawCursor(false);
	}

	/**
	 * Change the zoom level of screen space
	 * @param evt
	 */
	public handleMouseWheel(evt: WheelEvent) {
		if (Math.abs(evt.deltaY) === 0) {
			return; // We can't zoom by zero delta
		}
		const drawController = getScreenCanvasDrawController();
		drawController.zoomScreen(evt.deltaY);
	}

	public handleMouseDown(evt: MouseEvent) {
		// Pan with the middle mouse button, or with the left mouse button while holding space
		const isPanButton =
			evt.button === MouseButton.Middle || (evt.button === MouseButton.Left && this.isSpaceHeld);
		if (!isPanButton) return;

		setPanStartLocation(
			new Point(
				evt.clientX - getCanvasOffsetLeft(),
				getScreenCanvasDrawController().getCanvasSize().y - evt.clientY
			)
		);
	}

	/**
	 * Returns a distance to pan the screen when a directional arrow is pressed
	 * Offset is based on shift key being pressed (larger offset)
	 * and zoom level
	 * @private
	 */
	private getScreenPanStep(
		direction: 'up' | 'right' | 'down' | 'left',
		shiftPressed: boolean
	): Point {
		const screenOffset = getScreenCanvasDrawController().getScreenOffset();
		const screenZoom = getScreenCanvasDrawController().getScreenScale();
		let step = 20;
		if (shiftPressed) {
			step = 100;
		}
		step /= screenZoom;
		switch (direction) {
			case 'up':
				return new Point(screenOffset.x, screenOffset.y - step);
			case 'right':
				return new Point(screenOffset.x - step, screenOffset.y);
			case 'down':
				return new Point(screenOffset.x, screenOffset.y + step);
			case 'left':
				return new Point(screenOffset.x + step, screenOffset.y);
		}
	}

	private setSpaceHeld(isSpaceHeld: boolean) {
		this.isSpaceHeld = isSpaceHeld;
		const canvas = getCanvas();
		if (canvas) {
			canvas.style.cursor = isSpaceHeld ? 'grab' : '';
		}
	}

	public handleKeyStroke(evt: KeyboardEvent) {
		if (shouldLetElementHandleKey(evt)) {
			return;
		}
		if (evt.key === ' ' && this.text === '' && !activeToolAcceptsTextInput()) {
			// Space without typed text starts panning with the left mouse button, instead of typing a space
			evt.preventDefault();
			this.setSpaceHeld(true);
			return;
		}
		// The typed text is drawn next to the cursor
		requestRedraw();
		if (evt.key === 'F12') {
			// F12 => open developer tools
			return;
		}
		if (evt.key === 'F5') {
			// F5 => reload the page
			return;
		}
		if (evt.key === 'F11') {
			// F11 => toggle fullscreen
			return;
		}
		if (evt.key === 'Tab') {
			// Tab => move keyboard focus
			return;
		}
		evt.preventDefault();
		evt.stopPropagation();
		// Cmd on macOS behaves like Ctrl on other platforms
		const isCtrl = evt.ctrlKey || evt.metaKey;
		const key = evt.key.toLowerCase();
		if (isCtrl && key === 'v') {
			// User wants to paste the clipboard
		} else if (isCtrl && key === 's') {
			// User wants to save the drawing to local storage
			localStorageExport().then((isSaved) => isSaved && toast.success('Saved'));
		} else if (evt.key === '[' && this.text === '') {
			// User wants to collapse or expand the sidebar
			window.dispatchEvent(new CustomEvent(HtmlEvent.TOGGLE_SIDEBAR));
		} else if (isCtrl && !evt.shiftKey && key === 'z') {
			// User wants to undo the last action
			this.handleUndo(evt);
		} else if (isCtrl && evt.shiftKey && key === 'z') {
			// User wants to redo the last action
			this.handleRedo(evt);
		} else if (isCtrl && key === 'y') {
			// User wants to redo the last action
			this.handleRedo(evt);
		} else if (isCtrl && key === 'a') {
			// User wants to select everything
			setSelectedEntityIds(getEditableEntities().map((entity) => entity.id));
		} else if (evt.key === 'Backspace') {
			// Remove the last character from the input field
			evt.preventDefault();
			this.text = this.text.slice(0, this.text.length - 1);
		} else if (evt.key === 'Delete') {
			// User wants to delete the current selection
			evt.preventDefault();
			getActiveToolActor()?.send({
				type: ActorEvent.DELETE,
			});
		} else if (evt.key === 'Escape') {
			// User wants to cancel the current action
			this.handleEscapeKey();
		} else if (evt.key === 'Enter') {
			// User wants to submit the input or submit the action
			this.handleEnterKey();
		} else if (evt.key === 'ArrowDown') {
			// Move the screen down
			getScreenCanvasDrawController().setScreenOffset(this.getScreenPanStep('down', evt.shiftKey));
		} else if (evt.key === 'ArrowUp') {
			// Move the screen up
			getScreenCanvasDrawController().setScreenOffset(this.getScreenPanStep('up', evt.shiftKey));
		} else if (evt.key === 'ArrowLeft') {
			// Move the screen left
			getScreenCanvasDrawController().setScreenOffset(this.getScreenPanStep('left', evt.shiftKey));
		} else if (evt.key === 'ArrowRight') {
			// Move the screen right
			getScreenCanvasDrawController().setScreenOffset(this.getScreenPanStep('right', evt.shiftKey));
		} else if (evt.key === '+' && this.text === '' && !activeToolAcceptsTextInput()) {
			// Zoom in around the center of the screen
			zoomIn();
		} else if (
			evt.key === '-' &&
			this.text === '' &&
			!getShouldDrawHelpers() &&
			!activeToolAcceptsTextInput()
		) {
			// Zoom out around the center of the screen
			// While picking points, minus starts a negative number instead
			zoomOut();
		} else if (evt.key === 'F7') {
			// Show or hide the grid
			setGridSettings({ ...getGridSettings(), isVisible: !getGridSettings().isVisible });
		} else if (evt.key === 'F9') {
			// Snap to the grid
			setGridSettings({ ...getGridSettings(), isSnapEnabled: !getGridSettings().isSnapEnabled });
		} else if (evt.key === 'Home') {
			// Zoom to show the whole drawing
			zoomToBounds();
		} else if (
			evt.key?.length === 1 &&
			this.text === '' &&
			getActiveToolInstantOptions().includes(evt.key.toUpperCase())
		) {
			// The active tool has a single key option, apply it instantly instead of typing it
			getActiveToolActor()?.send({
				type: ActorEvent.TEXT_INPUT,
				value: evt.key.toUpperCase(),
			} as TextInputEvent);
		} else if (evt.key?.length === 1) {
			// User entered a single character => add to input field text
			this.text += evt.key;
		}
	}

	public handleEscapeKey() {
		if (getSelectedEntities().length > 0) {
			// Deselect entities
			setSelectedEntityIds([]);
		} else if (this.text === '') {
			// Cancel tool action
			getActiveToolActor()?.send({
				type: ActorEvent.ESC,
			});
		} else {
			// clear the input field
			this.text = '';
		}
	}

	public handleEnterKey() {
		// submit the text as input to the active tool and clear the input field
		const activeTool = getActiveToolActor();
		const activeToolCanHandleTextInput = activeToolAcceptsTextInput();
		const text = this.text;
		this.text = '';

		if (text === '') {
			// Send the ENTER event to the active tool
			activeTool?.send({
				type: ActorEvent.ENTER,
			});
			return;
		}

		const isZoomToolActive = activeTool?.getSnapshot()?.context.type === Tool.ZOOM;
		const isNumberForTool =
			activeToolAcceptsNumberInput() && parseCommandInput(text).type === 'number';
		if (
			activeToolCanHandleTextInput &&
			!isNumberForTool &&
			(!isZoomToolActive || isZoomOption(text))
		) {
			// The active tool asks for text, eg: a zoom option or the label of a text entity
			activeTool?.send({
				type: ActorEvent.TEXT_INPUT,
				value: text,
			} as TextInputEvent);
			return;
		}

		const command = parseCommandInput(text);
		switch (command.type) {
			case 'tool':
				// User entered a command. eg: L or LINE
				activeTool?.stop();
				setActiveToolActor(new Actor(TOOL_STATE_MACHINES[command.tool]));
				break;

			case 'number':
				// User entered a number. eg: 100
				activeTool?.send({
					type: ActorEvent.NUMBER_INPUT,
					value: command.value,
					worldMouseLocation:
						getSnapPointOnAngleGuide()?.point ||
						getSnapPoint()?.point ||
						getScreenCanvasDrawController().getWorldMouseLocation(),
				} as NumberInputEvent);
				break;

			case 'absolutePoint':
				// User entered coordinates to an absolute point on the canvas. eg: 100, 200
				activeTool?.send({
					type: ActorEvent.ABSOLUTE_POINT_INPUT,
					value: new Point(command.x, command.y),
				} as AbsolutePointInputEvent);
				break;

			case 'relativePoint':
				// User entered coordinates relative to the last point. eg: @100, 200
				activeTool?.send({
					type: ActorEvent.RELATIVE_POINT_INPUT,
					value: new Point(command.x, command.y),
				} as RelativePointInputEvent);
				break;

			case 'text':
				activeTool?.send({
					type: ActorEvent.TEXT_INPUT,
					value: command.value,
				} as TextInputEvent);
				break;
		}
	}

	public handleUndo(evt?: KeyboardEvent) {
		evt?.preventDefault();
		undo();
		setGhostHelperEntities([]);
		setSelectedEntityIds([]);
		getActiveToolActor()?.send({
			type: ActorEvent.ESC,
		});
	}

	public handleRedo(evt?: KeyboardEvent) {
		evt?.preventDefault();
		redo();
		setGhostHelperEntities([]);
		setSelectedEntityIds([]);
		getActiveToolActor()?.send({
			type: ActorEvent.ESC,
		});
	}

	private drawListBelowInputField(
		drawController: ScreenCanvasDrawController,
		texts: string[]
	): void {
		const screenMouseLocation = drawController.worldToTarget(
			drawController.getWorldMouseLocation()
		);
		const startY =
			screenMouseLocation.y - CANVAS_INPUT_FIELD_MOUSE_OFFSET - CANVAS_INPUT_FIELD_HEIGHT * 2 - 2;
		const offsetY = CANVAS_INPUT_FIELD_HEIGHT;
		texts.forEach((text, index) => {
			drawController.drawTextScreen(
				text,
				new Point(
					screenMouseLocation.x + CANVAS_INPUT_FIELD_MOUSE_OFFSET + 2,
					startY - index * offsetY
				),
				{
					textAlign: 'left',
					textColor: CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
					fontSize: 18,
				}
			);
		});
	}
}
