import { Tool } from '../tools';
import { getPointAtDistanceTowards, moveEntities } from './move-tool.helpers';
import { createGuideLine, createTransformToolStateMachine } from './transform-tool.helpers';

/**
 * Copy tool state machine
 * Works like the move tool, but keeps the originals in place
 * After placing a copy, the user can keep clicking to place more copies, ESC stops
 */
export const copyToolStateMachine = createTransformToolStateMachine({
	tool: Tool.COPY,
	verb: 'copy',
	pointInstructions: [
		'Select the base point of the copy',
		'Select the target point or type a distance, ESC to stop',
	],
	keepOriginals: true,
	repeat: true,
	transform: (entities, [basePoint, targetPoint]) =>
		moveEntities(entities, targetPoint.x - basePoint.x, targetPoint.y - basePoint.y),
	numberToPoint: (distance, [basePoint], mouseLocation) =>
		getPointAtDistanceTowards(basePoint, mouseLocation, distance),
	getGuideEntities: ([basePoint, targetPoint]) => [createGuideLine(basePoint, targetPoint)],
});
