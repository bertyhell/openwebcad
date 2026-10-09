import { Tool } from '../tools';
import { getPointAtDistanceTowards, moveEntities } from './move-tool.helpers';
import { createGuideLine, createTransformToolStateMachine } from './transform-tool.helpers';

/**
 * Move tool state machine
 * The user selects entities, then picks a base point and a target point
 * The selection is moved by the vector: base point => target point
 * Typing a number moves the selection that distance in the direction of the mouse
 */
export const moveToolStateMachine = createTransformToolStateMachine({
	tool: Tool.MOVE,
	verb: 'move',
	pointInstructions: [
		'Select the base point of the move',
		'Select the target point or type a distance',
	],
	transform: (entities, [basePoint, targetPoint]) =>
		moveEntities(entities, targetPoint.x - basePoint.x, targetPoint.y - basePoint.y),
	numberToPoint: (distance, [basePoint], mouseLocation) =>
		getPointAtDistanceTowards(basePoint, mouseLocation, distance),
	getGuideEntities: ([basePoint, targetPoint]) => [createGuideLine(basePoint, targetPoint)],
});
