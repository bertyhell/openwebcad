import { Point } from '@flatten-js/core';
import { compact, round } from 'es-toolkit';
import { toast } from 'react-toastify';
import { Actor, type AnyActorRef } from 'xstate';
import {
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR,
	CANVAS_INPUT_FIELD_HEIGHT,
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
	CANVAS_INPUT_FIELD_MOUSE_OFFSET,
	CANVAS_INPUT_FIELD_TEXT_COLOR,
	CANVAS_INPUT_FIELD_WIDTH,
	SNAP_POINT_DISTANCE,
	TOOLBAR_WIDTH,
} from '../App.consts.ts';
import { HtmlEvent, MouseButton, SnapPointType } from '../App.types.ts';
import { COMMAND_ACTIONS } from '../command-actions.ts';
import type { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController.ts';
import { calculateAngleGuidesAndSnapPoints } from '../helpers/calculate-angle-guides-and-snap-points.ts';
import { getClosestSnapPointWithinRadius } from '../helpers/get-closest-snap-point.ts';
import { localStorageExport } from '../helpers/import-export-handlers/local-storage.export.ts';
import {
	getActiveToolActor,
	getCanvas,
	getEditableEntities,
	getEditableSelectedEntities,
	getEntities,
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
	setEntities,
	setGhostHelperEntities,
	setGridSettings,
	setPanStartLocation,
	setSelectedEntityIds,
	setShouldDrawCursor,
	undo,
} from '../state.ts';
import { SelectState } from '../tools/select-tool.ts';
import { TOOL_STATE_MACHINES } from '../tools/tool.consts.ts';
import {
	type AbsolutePointInputEvent,
	ActorEvent,
	type MouseClickEvent,
	type NumberInputEvent,
	type RelativePointInputEvent,
	type StateEvent,
	type TextInputEvent,
} from '../tools/tool.types.ts';
import { zoomIn, zoomOut, zoomToBounds } from '../tools/zoom-tool.helpers.ts';
import { isZoomOption } from '../tools/zoom-tool.ts';
import { Tool } from '../tools.ts';
import { getCommandNamesFromPrefixText, parseCommandInput } from './command-parser.ts';

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
 * Ctrl, or Cmd on macOS, is held for a keyboard shortcut
 * Windows reports AltGr as Ctrl+Alt, keyboard layouts like AZERTY need AltGr to type characters like @ and [
 */
function isShortcutModifierPressed(evt: KeyboardEvent): boolean {
	const isAltGraph = !!evt.getModifierState?.('AltGraph') || (evt.ctrlKey && evt.altKey);
	return (evt.ctrlKey || evt.metaKey) && !isAltGraph;
}

/**
 * Letters that do something in the drawing together with Ctrl or Cmd
 * Other Ctrl or Cmd shortcuts are left to the browser, eg: Ctrl+C, Ctrl+P or Ctrl+R
 */
const CTRL_SHORTCUT_KEYS = ['z', 'y', 'a', 's', 'v'];

/**
 * Whether the active tool is asking for text, eg: the label of a text or a zoom option
 */
function activeToolAcceptsTextInput(): boolean {
	const activeToolSnapshot = getActiveToolActor()?.getSnapshot();
	const activeToolState = activeToolSnapshot?.value;
	return !!activeToolSnapshot?.machine?.states?.[activeToolState]?.config?.on?.TEXT_INPUT;
}

/**
 * Whether the active tool is asking for any text, eg: the label of a text
 * A tool that only offers single key options, eg: [I]nvert in the arc tool, doesn't,
 * so keys like space, + and [ keep their own meaning there
 */
function activeToolWantsFreeText(): boolean {
	return activeToolAcceptsTextInput() && getActiveToolInstantOptions().length === 0;
}

/**
 * The select tool that the active tool runs while it waits for a selection, eg: MOVE before anything is selected
 */
function getSelectToolInsideActiveTool(): AnyActorRef | undefined {
	const children: Record<string, AnyActorRef | undefined> =
		getActiveToolActor()?.getSnapshot()?.children ?? {};
	return Object.values(children).find(
		(child) => child?.getSnapshot()?.context?.type === Tool.SELECT
	);
}

/**
 * Whether the active tool's current state reacts to this event, eg: the arrow keys in the polygon tool
 */
function activeToolHandlesEvent(event: StateEvent): boolean {
	try {
		return !!getActiveToolActor()?.getSnapshot()?.can(event);
	} catch {
		// A guard can throw for input that doesn't fit the current step, the tool can't use that input either
		return false;
	}
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
 * Whether the text is a single key option that the active tool can apply right now
 * An option that isn't possible yet is typed like other text instead. eg: [C]lose in the line tool needs 2 segments
 */
function activeToolTakesInstantOption(text: string): boolean {
	const option = text.trim().toUpperCase();
	return (
		getActiveToolInstantOptions().includes(option) &&
		activeToolHandlesEvent({ type: ActorEvent.TEXT_INPUT, value: option })
	);
}

/**
 * Whether the active tool is waiting for its first input, eg: the line tool waiting for the start point
 * The first waiting state is the one the INIT state moves to
 */
function activeToolIsAtStart(): boolean {
	const activeToolSnapshot = getActiveToolActor()?.getSnapshot();
	const activeToolState = activeToolSnapshot?.value;
	const machine = activeToolSnapshot?.machine;
	if (!machine || typeof activeToolState !== 'string') {
		return false;
	}
	// A tool that waits for a selection is at its start until the user starts a selection window,
	// eg: MOVE, which also goes back to waiting for a selection after every move
	const selectToolInsideActiveTool = getSelectToolInsideActiveTool();
	if (selectToolInsideActiveTool) {
		return (
			selectToolInsideActiveTool.getSnapshot().value === SelectState.WAITING_FOR_FIRST_SELECT_POINT
		);
	}
	const initialState = machine.config.initial;
	if (typeof initialState !== 'string') {
		return false;
	}
	const always = machine.states?.[initialState]?.config?.always;
	// A tool can start in different states, eg: the circle tool remembers its center/radius or 3 point mode
	const startStates = (Array.isArray(always) ? always : [always])
		.map((transition) => transition?.target)
		.filter((target): target is string => typeof target === 'string')
		.map((target) => target.replace(/^\./, ''));
	return activeToolState === initialState || startStates.includes(activeToolState);
}

/**
 * Whether the active tool also accepts a number in its current state, eg: the arc angle next to the [I]nvert option
 */
function activeToolAcceptsNumberInput(): boolean {
	const activeToolSnapshot = getActiveToolActor()?.getSnapshot();
	const activeToolState = activeToolSnapshot?.value;
	return !!activeToolSnapshot?.machine?.states?.[activeToolState]?.config?.on?.NUMBER_INPUT;
}

/**
 * Start the active tool again from its first step, without finishing what it was busy with
 */
function restartActiveTool(): void {
	// Clear the selection first, tools that act on the selection would otherwise act on it again when they start. eg: erase
	setSelectedEntityIds([]);
	setGhostHelperEntities([]);
	const activeToolType = getActiveToolActor()?.getSnapshot()?.context?.type as Tool | undefined;
	if (!activeToolType || !TOOL_STATE_MACHINES[activeToolType]) {
		return;
	}
	// The image import tool would wait for a file without opening the file picker
	const toolType = activeToolType === Tool.IMAGE_IMPORT ? Tool.SELECT : activeToolType;
	setActiveToolActor(new Actor(TOOL_STATE_MACHINES[toolType]));
}

export class InputController {
	private text = '';

	/**
	 * Holding space lets the user pan with the left mouse button
	 */
	private isSpaceHeld = false;

	/**
	 * The last tool the user started from the command line or the sidebar, ENTER at the idle prompt starts it again
	 */
	private lastTool: Tool | null = null;

	/**
	 * Text the user is typing in the input field next to the cursor
	 */
	public getText(): string {
		return this.text;
	}

	/**
	 * Remember the tool the user started, so ENTER at the idle prompt can repeat it
	 */
	public rememberLastTool(tool: Tool): void {
		// Repeating the select tool does nothing, and the image import tool needs a file from the file picker
		if (tool === Tool.SELECT || tool === Tool.IMAGE_IMPORT) {
			return;
		}
		this.lastTool = tool;
	}

	public getLastTool(): Tool | null {
		return this.lastTool;
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

		const matchingToolNames = getCommandNamesFromPrefixText(this.text);
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
		// Pan with the middle mouse button, or with the left mouse button while holding space or using the pan tool
		const isPanToolActive = getActiveToolActor()?.getSnapshot()?.context.type === Tool.PAN;
		const isPanButton =
			evt.button === MouseButton.Middle ||
			(evt.button === MouseButton.Left && (this.isSpaceHeld || isPanToolActive));
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
		// Cmd on macOS behaves like Ctrl on other platforms
		const isCtrl = isShortcutModifierPressed(evt);
		const key = evt.key?.toLowerCase() ?? '';
		if (isCtrl && key.length === 1 && !CTRL_SHORTCUT_KEYS.includes(key)) {
			// Leave other shortcuts to the browser, they never type text or pick an option of the active tool. eg: Ctrl+C
			return;
		}
		if (evt.key === ' ' && this.text === '' && !activeToolWantsFreeText()) {
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
		if (isCtrl && key === 'v') {
			// User wants to paste the clipboard
		} else if (isCtrl && key === 's') {
			// User wants to save the drawing to local storage
			localStorageExport().then((isSaved) => isSaved && toast.success('Saved'));
		} else if (evt.key === '[' && this.text === '' && !activeToolWantsFreeText()) {
			// User wants to collapse or expand the sidebar, a tool that asks for text gets the [ instead. eg: TEXT
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
			this.handleDeleteKey();
		} else if (evt.key === 'Escape') {
			// User wants to cancel the current action
			this.handleEscapeKey();
		} else if (evt.key === 'Enter') {
			// User wants to submit the input or submit the action
			// Prevent the enter from also clicking a button that a command focuses. eg: COLOR opens a popover
			evt.preventDefault();
			this.handleEnterKey();
		} else if (
			(evt.key === 'ArrowUp' || evt.key === 'ArrowDown') &&
			activeToolHandlesEvent({
				type: evt.key === 'ArrowUp' ? ActorEvent.ARROW_UP : ActorEvent.ARROW_DOWN,
			})
		) {
			// The active tool uses the up and down arrows, eg: to change the number of sides in the polygon tool
			evt.preventDefault();
			getActiveToolActor()?.send({
				type: evt.key === 'ArrowUp' ? ActorEvent.ARROW_UP : ActorEvent.ARROW_DOWN,
			});
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
		} else if (evt.key === '+' && this.text === '' && !activeToolWantsFreeText()) {
			// Zoom in around the center of the screen
			zoomIn();
		} else if (
			evt.key === '-' &&
			this.text === '' &&
			!getShouldDrawHelpers() &&
			!activeToolWantsFreeText()
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
		} else if (evt.key?.length === 1 && this.text === '' && activeToolTakesInstantOption(evt.key)) {
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

	/**
	 * ESC cancels one thing at a time, the most recent first:
	 * 1. the typed text
	 * 2. the step the active tool is busy with, eg: a selection window or the line that follows the mouse
	 * 3. the selection
	 * 4. the active tool, the select tool takes over
	 */
	public handleEscapeKey() {
		if (this.text !== '') {
			// Clear the input field
			this.text = '';
			return;
		}

		const activeTool = getActiveToolActor();
		const selectToolInsideActiveTool = getSelectToolInsideActiveTool();
		if (
			selectToolInsideActiveTool?.getSnapshot().value ===
			SelectState.WAITING_FOR_SECOND_SELECT_POINT
		) {
			// The tools that wait for a selection don't pass ESC on to their select tool, so cancel the selection window here
			selectToolInsideActiveTool.send({ type: ActorEvent.ESC });
			return;
		}

		if (!activeToolIsAtStart() && activeToolHandlesEvent({ type: ActorEvent.ESC })) {
			// Cancel the step the active tool is busy with
			activeTool?.send({ type: ActorEvent.ESC });
			return;
		}

		if (getSelectedEntities().length > 0) {
			// Deselect entities
			setSelectedEntityIds([]);
			return;
		}

		if (activeTool?.getSnapshot()?.context.type !== Tool.SELECT) {
			// Nothing to cancel in the active tool, go back to selecting
			setActiveToolActor(new Actor(TOOL_STATE_MACHINES[Tool.SELECT]));
			return;
		}

		// Let the select tool clear what is left of its previews
		activeTool?.send({ type: ActorEvent.ESC });
	}

	/**
	 * DELETE erases the selection in every tool, eg: after selecting everything with Ctrl+A while drawing lines
	 */
	public handleDeleteKey() {
		const selectedEntities = getEditableSelectedEntities();
		if (selectedEntities.length === 0) {
			getActiveToolActor()?.send({ type: ActorEvent.DELETE });
			return;
		}
		// Erase all selected entities in a single undo step
		const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
		setEntities(
			getEntities().filter((entity) => !selectedIds.has(entity.id)),
			true
		);
		setSelectedEntityIds([]);
	}

	/**
	 * Start a tool, eg: after typing its name
	 */
	public startTool(tool: Tool): void {
		getActiveToolActor()?.stop();
		setActiveToolActor(new Actor(TOOL_STATE_MACHINES[tool]));
		this.rememberLastTool(tool);
	}

	public handleEnterKey() {
		// submit the text as input to the active tool and clear the input field
		const activeTool = getActiveToolActor();
		const activeToolCanHandleTextInput = activeToolAcceptsTextInput();
		const text = this.text;
		this.text = '';

		if (text === '') {
			if (activeTool?.getSnapshot()?.context.type === Tool.SELECT) {
				// ENTER at the idle prompt repeats the last command, like in AutoCAD.
				// The select tool doesn't get the ENTER, that would finish it, so it would stop selecting
				if (this.lastTool && activeToolIsAtStart()) {
					this.startTool(this.lastTool);
				}
				return;
			}
			// Send the ENTER event to the active tool
			activeTool?.send({
				type: ActorEvent.ENTER,
			});
			return;
		}

		const isZoomToolActive = activeTool?.getSnapshot()?.context.type === Tool.ZOOM;
		const isNumberForTool =
			activeToolAcceptsNumberInput() && parseCommandInput(text).type === 'number';
		// A tool that only asks for single key options gets those options, other text is a command. eg: AREA => [O]bject
		const instantOptions = getActiveToolInstantOptions();
		const isOtherThanInstantOption =
			instantOptions.length > 0 && !activeToolTakesInstantOption(text);
		if (
			activeToolCanHandleTextInput &&
			!isNumberForTool &&
			!isOtherThanInstantOption &&
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
				this.startTool(command.tool);
				break;

			case 'action':
				// User entered a command that runs immediately. eg: REDRAW
				COMMAND_ACTIONS[command.action]();
				break;

			case 'number':
				// User entered a number. eg: 100
				this.sendInputToActiveTool(
					{
						type: ActorEvent.NUMBER_INPUT,
						value: command.value,
						worldMouseLocation:
							getSnapPointOnAngleGuide()?.point ||
							getSnapPoint()?.point ||
							getScreenCanvasDrawController().getWorldMouseLocation(),
					} as NumberInputEvent,
					text
				);
				break;

			case 'absolutePoint':
				// User entered coordinates to an absolute point on the canvas. eg: 100, 200 or 100<45
				this.sendInputToActiveTool(
					{
						type: ActorEvent.ABSOLUTE_POINT_INPUT,
						value: new Point(command.x, command.y),
					} as AbsolutePointInputEvent,
					text
				);
				break;

			case 'relativePoint':
				// User entered coordinates relative to the last point. eg: @100, 200 or @100<45
				this.sendInputToActiveTool(
					{
						type: ActorEvent.RELATIVE_POINT_INPUT,
						value: new Point(command.x, command.y),
					} as RelativePointInputEvent,
					text
				);
				break;

			case 'text':
				// The text is not a command and the active tool doesn't ask for text, keep the tool as it is
				toast.warn(`Unknown command: ${command.value}`);
				break;
		}
	}

	/**
	 * Send typed input to the active tool, or tell the user when the tool can't use it right now
	 * eg: a relative point before there is a point to be relative to
	 */
	private sendInputToActiveTool(event: StateEvent, text: string): void {
		if (!activeToolHandlesEvent(event)) {
			toast.warn(`Invalid input: ${text.trim()}`);
			return;
		}
		getActiveToolActor()?.send(event);
	}

	public handleUndo(evt?: KeyboardEvent) {
		evt?.preventDefault();
		if (getActiveToolActor()?.getSnapshot()?.can({ type: ActorEvent.UNDO })) {
			// The active tool undoes its own last step, eg: the last point of the polyline that is being drawn
			getActiveToolActor()?.send({ type: ActorEvent.UNDO });
			return;
		}
		// Discard what the active tool is busy with before undoing, sending ESC could finish it instead. eg: a polyline
		restartActiveTool();
		undo();
	}

	public handleRedo(evt?: KeyboardEvent) {
		evt?.preventDefault();
		restartActiveTool();
		redo();
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
