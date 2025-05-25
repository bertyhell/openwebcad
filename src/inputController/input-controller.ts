import {Point} from '@flatten-js/core';
import {compact, round} from 'es-toolkit';
import {Actor} from 'xstate';
import {
	CANVAS_INPUT_FIELD_BACKGROUND_COLOR,
	CANVAS_INPUT_FIELD_HEIGHT,
	CANVAS_INPUT_FIELD_INSTRUCTION_TEXT_COLOR,
	CANVAS_INPUT_FIELD_MOUSE_OFFSET,
	CANVAS_INPUT_FIELD_TEXT_COLOR,
	CANVAS_INPUT_FIELD_WIDTH,
	HIGHLIGHT_ENTITY_DISTANCE,
	SNAP_POINT_DISTANCE,
} from '../App.consts.ts';
import {MouseButton} from '../App.types.ts';
import type {ScreenCanvasDrawController} from '../drawControllers/screenCanvas.drawController.ts';
import {calculateAngleGuidesAndSnapPoints} from '../helpers/calculate-angle-guides-and-snap-points.ts';
import {findClosestEntity} from '../helpers/find-closest-entity.ts';
import {getClosestSnapPointWithinRadius} from '../helpers/get-closest-snap-point.ts';
import {
	getActiveToolActor,
	getCanvas,
	getEntities,
	getLastStateInstructions,
	getPanStartLocation,
	getScreenCanvasDrawController,
	getSelectedEntities,
	getSnapPoint,
	getSnapPointOnAngleGuide,
	getToolbarWidth,
	redo,
	setActiveToolActor,
	setGhostHelperEntities,
	setHighlightedEntityIds,
	setPanStartLocation,
	setSelectedEntityIds,
	setShouldDrawCursor,
	undo,
} from '../state.ts';
import {Tool} from '../tools.ts';
import {TOOL_STATE_MACHINES} from '../tools/tool.consts.ts';
import {
	type AbsolutePointInputEvent,
	ActorEvent,
	type MouseClickEvent,
	type NumberInputEvent,
	type RelativePointInputEvent,
	type TextInputEvent,
} from '../tools/tool.types.ts';

const NUMBER_REGEXP = /^[0-9]+([.][0-9]+)?$/;
const ABSOLUTE_POINT_REGEXP = /^([0-9]+([.][0-9]+)?)\s*,\s*([0-9]+([.][0-9]+)?)$/;
const RELATIVE_POINT_REGEXP = /^@([0-9]+([.][0-9]+)?)\s*,\s*([0-9]+([.][0-9]+)?)$/;

export class InputController {
	private text = '';

	constructor() {
		if (typeof process === 'object' && process?.env?.NODE_ENV === 'test') {
			return; // used during unit testing
		}
		// Listen for keystrokes
		document.addEventListener('keydown', (evt) => {
			this.handleKeyStroke(evt);
		});
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

		const matchingToolNames = this.getToolNamesFromPrefixText();
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

		if (evt.button === MouseButton.Middle) {
			setPanStartLocation(null);
		}
		if (evt.button === MouseButton.Left) {
			const screenCanvasDrawController = getScreenCanvasDrawController();
			const closestSnapPoint = getClosestSnapPointWithinRadius(
				compact([getSnapPoint(), getSnapPointOnAngleGuide()]),
				screenCanvasDrawController.getWorldMouseLocation(),
				SNAP_POINT_DISTANCE / screenCanvasDrawController.getScreenScale()
			);

			const worldMouseLocationTemp = getScreenCanvasDrawController().targetToWorld(
				new Point(
					evt.clientX - getToolbarWidth(),
					getScreenCanvasDrawController().getCanvasSize().y - evt.clientY
				)
			);
			const worldMouseLocation = closestSnapPoint ? closestSnapPoint.point : worldMouseLocationTemp;

			const activeToolActor = getActiveToolActor();
			activeToolActor?.send({
				type: ActorEvent.MOUSE_CLICK,
				worldMouseLocation,
				screenMouseLocation: screenCanvasDrawController.worldToTarget(worldMouseLocation),
				holdingCtrl: evt.ctrlKey,
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
			evt.clientX - getToolbarWidth(),
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
				getEntities()
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
		const drawController = getScreenCanvasDrawController();
		drawController.zoomScreen(evt.deltaY);
	}

	public handleMouseDown(evt: MouseEvent) {
		if (evt.button !== MouseButton.Middle) return;

		setPanStartLocation(
			new Point(
				evt.clientX - getToolbarWidth(),
				getScreenCanvasDrawController().getCanvasSize().y - evt.clientY
			)
		);
	}

	public handleKeyStroke(evt: KeyboardEvent) {
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
		if (evt.ctrlKey && evt.key === 'v') {
			// User wants to paste the clipboard
		} else if (evt.ctrlKey && !evt.shiftKey && evt.key === 'z') {
			// User wants to undo the last action
			this.handleUndo(evt);
		} else if (evt.ctrlKey && evt.shiftKey && evt.key === 'z') {
			// User wants to redo the last action
			this.handleRedo(evt);
		} else if (evt.ctrlKey && evt.key === 'y') {
			// User wants to redo the last action
			this.handleRedo(evt);
		} else if (evt.ctrlKey && evt.key === 'a') {
			// User wants to select everything
			setSelectedEntityIds(getEntities().map((entity) => entity.id));
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
		} else if (evt.key?.length === 1) {
			// User entered a single character => add to input field text
			this.text += evt.key.toUpperCase();
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

	private getToolNamesFromPrefixText(): Tool[] {
		if (this.text === '') {
			return [];
		}
		return (Object.keys(TOOL_STATE_MACHINES).filter((cmd) =>
			cmd.startsWith(this.text.toUpperCase())
		) || null) as Tool[];
	}

	public handleEnterKey() {
		// submit the text as input to the active tool and clear the input field
		const activeTool = getActiveToolActor();
		const activeToolSnapshot = activeTool?.getSnapshot();
		const activeToolState = activeToolSnapshot?.value;
		const activeToolCanHandleTextInput =
			!!activeToolSnapshot?.machine?.states?.[activeToolState]?.config?.on?.TEXT_INPUT;

		if (this.text === '') {
			console.log('ENTER: ', {
				text: this.text,
				activeTool: getActiveToolActor(),
			});
			// Send the ENTER event to the active tool
			getActiveToolActor()?.send({
				type: ActorEvent.ENTER,
			});
		} else if (activeToolCanHandleTextInput) {
			console.log('TEXT_INPUT: ', {
				text: this.text,
				activeTool: getActiveToolActor(),
			});
			// Send the text to the active tool
			getActiveToolActor()?.send({
				type: ActorEvent.TEXT_INPUT,
				value: this.text,
			} as TextInputEvent);
			this.text = '';
		} else if (this.getToolNamesFromPrefixText()[0]) {
			// User entered a command. eg: L or LINE
			const toolName = this.getToolNamesFromPrefixText()[0];

			getActiveToolActor()?.stop();

			const newToolActor = new Actor(TOOL_STATE_MACHINES[toolName]);
			setActiveToolActor(newToolActor);

			console.log('SWITCH TO TOOL: ', {
				toolName,
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				activeTool: (getActiveToolActor()?.src as any).config.context.type,
			});

			this.text = '';
		} else if (NUMBER_REGEXP.test(this.text)) {
			console.log(' NUMBER_INPUT: ', {
				text: this.text,
				activeTool: getActiveToolActor(),
			});
			// User entered a number. eg: 100
			getActiveToolActor()?.send({
				type: ActorEvent.NUMBER_INPUT,
				value: Number.parseFloat(this.text),
				worldMouseLocation:
					getSnapPointOnAngleGuide()?.point ||
					getSnapPoint()?.point ||
					getScreenCanvasDrawController().getWorldMouseLocation(),
			} as NumberInputEvent);
			this.text = '';
		} else if (ABSOLUTE_POINT_REGEXP.test(this.text)) {
			console.log('ABSOLUTE_POINT_INPUT: ', {
				text: this.text,
				activeTool: getActiveToolActor(),
			});
			// User entered coordinates to an absolute point on the canvas. eg: 100, 200
			const match = ABSOLUTE_POINT_REGEXP.exec(this.text);
			if (!match) {
				return;
			}
			const x = Number.parseFloat(match[1]);
			const y = Number.parseFloat(match[3]);
			getActiveToolActor()?.send({
				type: ActorEvent.ABSOLUTE_POINT_INPUT,
				value: new Point(x, y),
			} as AbsolutePointInputEvent);
			this.text = '';
		} else if (RELATIVE_POINT_REGEXP.test(this.text)) {
			console.log('RELATIVE_POINT_INPUT: ', {
				text: this.text,
				activeTool: getActiveToolActor(),
			});
			// User entered coordinates to a relative point on the canvas. eg: @100, 200
			const match = RELATIVE_POINT_REGEXP.exec(this.text);
			if (!match) {
				return;
			}
			const x = Number.parseFloat(match[1]);
			const y = Number.parseFloat(match[3]);
			getActiveToolActor()?.send({
				type: ActorEvent.RELATIVE_POINT_INPUT,
				value: new Point(x, y),
			} as RelativePointInputEvent);
			this.text = '';
		} else {
			console.log('TEXT_INPUT: ', {
				text: this.text,
				activeTool: getActiveToolActor(),
			});
			// Send the text to the active tool
			getActiveToolActor()?.send({
				type: ActorEvent.TEXT_INPUT,
				value: this.text,
			} as TextInputEvent);
			this.text = '';
		}
	}

	public handleUndo(evt: KeyboardEvent) {
		evt.preventDefault();
		undo();
		setGhostHelperEntities([]);
		setSelectedEntityIds([]);
		getActiveToolActor()?.send({
			type: ActorEvent.ESC,
		});
	}

	public handleRedo(evt: KeyboardEvent) {
		evt.preventDefault();
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
