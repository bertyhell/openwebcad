import { InputController } from '../../src/helpers/input-controller';
import { MouseButton } from '../../src/App.types';

export function click(
    inputController: InputController,
    x: number,
    y: number,
    mouseButton: MouseButton = MouseButton.Left,
) {
    inputController.handleMouseUp({
        button: mouseButton,
        clientX: x,
        clientY: y,
        preventDefault: () => {},
        stopPropagation: () => {},
    } as MouseEvent);
}
