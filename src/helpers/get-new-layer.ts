import type {Layer} from '../App.types.ts';
import {getLayers} from '../state.ts';

export function getNewLayer(): Layer {
	return {
		id: crypto.randomUUID(),
		isLocked: false,
		isVisible: true,
		name: `New layer ${getLayers().length}${1}`,
	};
}
