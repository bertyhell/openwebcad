import {TOOLBAR_WIDTH} from '../../src/App.consts';
import {MouseButton} from '../../src/App.types';
import type {InputController} from '../../src/inputController/input-controller';

/**
 * Trigger a click event on the canvas
 * @param inputController
 * @param x x-coordinate relative to the left of the draw area excluding the toolbar
 * @param y y-coordinate relative to the top of the draw area
 * @param mouseButton
 */
export function click(
	inputController: InputController,
	x: number,
	y: number,
	mouseButton: MouseButton = MouseButton.Left
) {
	inputController.handleMouseUp({
		button: mouseButton,
		clientX: TOOLBAR_WIDTH + x, // Coordinates are relative to the top left of the draw area excluding the toolbar
		clientY: y,
		preventDefault: () => {},
		stopPropagation: () => {},
	} as MouseEvent);
}
