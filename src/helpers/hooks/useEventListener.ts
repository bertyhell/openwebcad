import { useEffect } from 'react';

export const useEventListener = (target: HTMLElement | Window | null | undefined, type: string, eventHandler: (evt: any) => void) => {
	useEffect(
			() => {
				if (target) {
					target.addEventListener(type, eventHandler);
					return () => target.removeEventListener(type, eventHandler);
				}
			}, [target, eventHandler],
	);
};
