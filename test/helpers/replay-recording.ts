import type {InputController} from '../../src/inputController/input-controller';
import {Tool} from '../../src/tools';
import {click} from './click';
import type {Recording, Step} from './replay-recording.types';
import {setActiveTool} from './set-active-tool';

const DATA_ID_TO_TOOL_NAME: Record<string, Tool | null> = {
	'select-button': Tool.SELECT,
	'line-button': Tool.LINE,
	'rectangle-button': Tool.RECTANGLE,
	'circle-button': Tool.CIRCLE,
	'move-button': Tool.MOVE,
	'scale-button': Tool.SCALE,
	'rotate-button': Tool.ROTATE,
	'measurement-button': Tool.MEASUREMENT,
	'undo-button': null,
	'redo-button': null,
	'delete-segment-button': Tool.ERASER,
	'line-color-button': null,
	'line-width-button': null,
	'angle-guide-button': null,
	'angle-guide-5-button': null,
	'angle-guide-15-button': null,
	'angle-guide-30-button': null,
	'angle-guide-45-button': null,
	'angle-guide-90-button': null,
	'zoom-level-button': null,
	'import-image-button': null,
	'json-open-button': null,
	'json-save-button': null,
	'svg-export-button': null,
	'png-export-button': null,
	'pdf-export-button': null,
	'github-link-button': null,
};

function handleClick(inputController: InputController, step: Step) {
	const firstSelector = step.selectors[0][0];
	if (firstSelector.startsWith('[data-id')) {
		// clicked a button or the canvas
		const dataId = step.selectors[0][0].split("'")[1];
		if (dataId === 'canvas') {
			click(inputController, step.offsetX, step.offsetY);
		} else if (DATA_ID_TO_TOOL_NAME[dataId]) {
			setActiveTool(DATA_ID_TO_TOOL_NAME[dataId]);
		} else {
			console.error('Failed to replay step: ', step);
		}
	} else {
		console.error('Failed to replay step without data id: ', step);
	}
}

function handleKeyUp(inputController: InputController, step: Step) {
	inputController.handleKeyStroke({
		key: step.key,
		preventDefault: () => {},
		stopPropagation: () => {},
		ctrlKey: false,
		shiftKey: false,
	} as KeyboardEvent);
}

export function replayRecording(inputController: InputController, recording: Recording) {
	for (const step of recording.steps) {
		switch (step.type) {
			case 'click':
				handleClick(inputController, step);
				break;

			case 'keyUp':
				handleKeyUp(inputController, step);
				break;
		}
	}
}
