import type { Edge } from '../App.types.ts';

export interface BoundaryWithHoles {
	boundary: Edge[];
	holes: Edge[][];
}

export interface BoundaryWithHolesAndArea extends BoundaryWithHoles {
	// Contains the area of the outer boundary
	// the areas of the holes are not subtracted from this result
	area: number;
}
