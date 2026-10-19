import type { Point } from '@flatten-js/core';
import type { Entity } from '../entities/Entity';

/**
 * Moves the first source point onto the first destination point,
 * then rotates around it so the direction source1 => source2 matches the direction destination1 => destination2
 */
export function alignEntities(
	entities: Entity[],
	source1: Point,
	destination1: Point,
	source2: Point,
	destination2: Point
): void {
	const sourceAngle = Math.atan2(source2.y - source1.y, source2.x - source1.x);
	const destinationAngle = Math.atan2(
		destination2.y - destination1.y,
		destination2.x - destination1.x
	);
	const hasDirection = !source1.equalTo(source2) && !destination1.equalTo(destination2);
	for (const entity of entities) {
		entity.move(destination1.x - source1.x, destination1.y - source1.y);
		if (hasDirection) {
			entity.rotate(destination1, destinationAngle - sourceAngle);
		}
	}
}
