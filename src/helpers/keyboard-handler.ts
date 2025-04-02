import type {KeyboardEvent} from "react";

export function keyboardHandler(clickHandler: () => void) {
	return (evt: KeyboardEvent) => {
		if (evt.key === 'Enter' || evt.key === 'Space') {
			clickHandler();
		}
	};
}
