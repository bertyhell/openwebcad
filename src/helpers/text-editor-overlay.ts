import type { Point } from '@flatten-js/core';

/**
 * Shows a text area on top of the canvas to edit a multi-line text
 * - ENTER confirms, SHIFT + ENTER adds a new line
 * - ESC cancels
 * - Clicking outside the text area confirms
 * @param initialText
 * @param clientPosition top left of the text area in browser pixels
 * @returns the new text, or null when the user cancelled
 */
export function editTextInOverlay(
	initialText: string,
	clientPosition: Point
): Promise<string | null> {
	return new Promise((resolve) => {
		const textArea = document.createElement('textarea');
		textArea.value = initialText;
		textArea.setAttribute('aria-label', 'Text');
		textArea.rows = Math.max(2, initialText.split('\n').length + 1);
		Object.assign(textArea.style, {
			position: 'fixed',
			left: `${clientPosition.x}px`,
			top: `${clientPosition.y}px`,
			zIndex: '30',
			minWidth: '240px',
			padding: '6px 8px',
			font: '14px sans-serif',
			color: 'var(--color-hw-stone-100, #fff)',
			background: 'var(--color-hw-ash, #222)',
			border: '1px solid var(--color-hw-stone-500, #888)',
			borderRadius: '4px',
			resize: 'both',
		});

		let isDone = false;
		const finish = (text: string | null) => {
			if (isDone) return;
			isDone = true;
			textArea.remove();
			resolve(text);
		};

		textArea.addEventListener('keydown', (evt) => {
			// Keep the canvas from handling the keys while typing
			evt.stopPropagation();
			if (evt.key === 'Enter' && !evt.shiftKey) {
				evt.preventDefault();
				finish(textArea.value);
			} else if (evt.key === 'Escape') {
				evt.preventDefault();
				finish(null);
			}
		});
		textArea.addEventListener('blur', () => finish(textArea.value));

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
	});
}
