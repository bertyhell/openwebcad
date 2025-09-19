import type {Edge} from '../App.types.ts';

export interface CycleEdgeForest {
	cycle: Edge[];
	children: CycleEdgeForest[];
}
