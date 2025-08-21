import type {BoundingBox, Edge} from '../App.types.ts';
import type {Entity} from '../entities/Entity.ts';

export function getBoundingBoxOfMultipleEntities(entities: Entity[]): BoundingBox {
	let minX = Number.MAX_VALUE;
	let minY = Number.MAX_VALUE;
	let maxX = Number.MIN_VALUE;
	let maxY = Number.MIN_VALUE;

	for (const entity of entities) {
		const boundingBox = entity.getBoundingBox();
		if (boundingBox) {
			minX = Math.min(minX, boundingBox.xmin);
			minY = Math.min(minY, boundingBox.ymin);
			maxX = Math.max(maxX, boundingBox.xmax);
			maxY = Math.max(maxY, boundingBox.ymax);
		}
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
	};
}

export function getBoundingBoxOfMultipleEdges(edges: Edge[]): BoundingBox {
	let minX = Number.MAX_VALUE;
	let minY = Number.MAX_VALUE;
	let maxX = Number.MIN_VALUE;
	let maxY = Number.MIN_VALUE;

	for (const shape of edges) {
		const boundingBox = shape.box;
		if (boundingBox) {
			minX = Math.min(minX, boundingBox.xmin);
			minY = Math.min(minY, boundingBox.ymin);
			maxX = Math.max(maxX, boundingBox.xmax);
			maxY = Math.max(maxY, boundingBox.ymax);
		}
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
	};
}
