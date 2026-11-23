import type { InputController } from '../../src/inputController/input-controller';
import { getActiveToolActor } from '../../src/state';

export interface KeyOptions {
	ctrlKey?: boolean;
	metaKey?: boolean;
	shiftKey?: boolean;
	altKey?: boolean;
}

/**
 * Press a key and return whether the input controller kept the browser from handling it
 */
export function pressKey(
	inputController: InputController,
	key: string,
	options: KeyOptions = {}
): { defaultPrevented: boolean } {
	const result = { defaultPrevented: false };
	inputController.handleKeyStroke({
		key,
		ctrlKey: false,
		metaKey: false,
		shiftKey: false,
		altKey: false,
		...options,
		preventDefault: () => {
			result.defaultPrevented = true;
		},
		stopPropagation: () => {},
	} as KeyboardEvent);
	return result;
}

/**
 * Type the text into the input field next to the cursor, one key at a time
 */
export function typeText(inputController: InputController, text: string): void {
	for (const character of text) {
		pressKey(inputController, character);
	}
}

/**
 * Type the text and press ENTER
 */
export function typeCommand(inputController: InputController, text: string): void {
	typeText(inputController, text);
	pressKey(inputController, 'Enter');
}

export function getToolType() {
	return getActiveToolActor()?.getSnapshot().context.type;
}

export function getToolState() {
	return getActiveToolActor()?.getSnapshot().value;
}
