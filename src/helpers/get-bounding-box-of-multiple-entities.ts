import {Entity} from "../entities/Entity.ts";

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export function getBoundingBoxOfMultipleEntities(entities: Entity[]): BoundingBox {
	let minX = Number.MAX_VALUE;
	let minY = Number.MAX_VALUE;
	let maxX = Number.MIN_VALUE;
	let maxY = Number.MIN_VALUE;

	entities.forEach(entity => {
		const boundingBox = entity.getBoundingBox();
		if (boundingBox) {
			minX = Math.min(minX, boundingBox.xmin);
			minY = Math.min(minY, boundingBox.ymin);
			maxX = Math.max(maxX, boundingBox.xmax);
			maxY = Math.max(maxY, boundingBox.ymax);
		}
	});

	return {
		minX,
		minY,
		maxX,
		maxY
	}
}
