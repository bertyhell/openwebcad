import { Point } from '@flatten-js/core';
import { Actor, createMachine } from 'xstate';
import { EntityName } from '../entities/Entity.ts';
import type { TextEntity } from '../entities/TextEntity.ts';
import { pickEntity } from '../helpers/pick-entity.ts';
import { editTextInOverlay } from '../helpers/text-editor-overlay.ts';
import {
	getCanvas,
	getEditableEntities,
	getEntities,
	getScreenCanvasDrawController,
	setActiveToolActor,
	setAngleGuideOriginPoint,
	setEntities,
	setGhostHelperEntities,
	setSelectedEntityIds,
	setShouldDrawHelpers,
} from '../state';
import { Tool } from '../tools';
import { selectToolStateMachine } from './select-tool.ts';
import type { MouseClickEvent, StateEvent, ToolContext } from './tool.types';

export enum TextEditState {
	INIT = 'INIT',
	WAITING_FOR_TEXT = 'WAITING_FOR_TEXT',
}

export enum TextEditAction {
	INIT_TEXTEDIT_TOOL = 'INIT_TEXTEDIT_TOOL',
	EDIT_TEXT = 'EDIT_TEXT',
	SWITCH_TO_SELECT_TOOL = 'SWITCH_TO_SELECT_TOOL',
}

function pickText(worldPoint: Point): TextEntity | null {
	const texts = getEditableEntities().filter((entity) => entity.getType() === EntityName.Text);
	return pickEntity(worldPoint, texts) as TextEntity | null;
}

/**
 * Browser position of the top left corner of the text
 */
function getClientPosition(text: TextEntity): Point {
	const drawController = getScreenCanvasDrawController();
	const boundingBox = text.getBoundingBox();
	const topLeft = drawController.worldToTarget(new Point(boundingBox.xmin, boundingBox.ymax));
	const canvasRect = getCanvas()?.getBoundingClientRect();
	return new Point(
		(canvasRect?.left ?? 0) + topLeft.x,
		(canvasRect?.top ?? 0) + drawController.getCanvasSize().y - topLeft.y
	);
}

async function editText(text: TextEntity): Promise<void> {
	setSelectedEntityIds([text.id]);
	const newLabel = await editTextInOverlay(text.getLabel(), getClientPosition(text));
	setSelectedEntityIds([]);
	if (newLabel === null || !newLabel.trim() || newLabel === text.getLabel()) {
		return;
	}
	const editedText = text.clone();
	editedText.id = text.id;
	editedText.setLabel(newLabel);
	setEntities(
		getEntities().map((entity) => (entity.id === text.id ? editedText : entity)),
		true
	);
}

/**
 * Text edit tool state machine
 * Click a text to change its content, SHIFT + ENTER adds a new line
 */
export const textEditToolStateMachine = createMachine(
	{
		types: {} as {
			context: ToolContext;
			events: StateEvent;
		},
		context: {
			type: Tool.TEXTEDIT,
		},
		initial: TextEditState.INIT,
		states: {
			[TextEditState.INIT]: {
				description: 'Initializing the text edit tool',
				always: {
					actions: TextEditAction.INIT_TEXTEDIT_TOOL,
					target: TextEditState.WAITING_FOR_TEXT,
				},
			},
			[TextEditState.WAITING_FOR_TEXT]: {
				description: 'Select the text to edit',
				meta: {
					instructions: 'Select the text to edit, SHIFT + ENTER adds a new line',
				},
				on: {
					MOUSE_CLICK: {
						actions: TextEditAction.EDIT_TEXT,
					},
					ESC: {
						actions: TextEditAction.SWITCH_TO_SELECT_TOOL,
					},
				},
			},
		},
	},
	{
		actions: {
			[TextEditAction.INIT_TEXTEDIT_TOOL]: () => {
				setShouldDrawHelpers(false);
				setSelectedEntityIds([]);
				setGhostHelperEntities([]);
				setAngleGuideOriginPoint(null);
			},
			[TextEditAction.EDIT_TEXT]: ({ event }) => {
				const text = pickText((event as MouseClickEvent).worldMouseLocation);
				if (text) {
					editText(text).catch((err) => console.error('Failed to edit text', err));
				}
			},
			[TextEditAction.SWITCH_TO_SELECT_TOOL]: () => {
				setActiveToolActor(new Actor(selectToolStateMachine));
			},
		},
	}
);
