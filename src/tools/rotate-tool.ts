import { Tool } from '../tools';
import { getPointAtAngle, rotateEntities } from './rotate-tool.helpers';
import { createGuideLine, createTransformToolStateMachine } from './transform-tool.helpers';

/**
 * Rotate tool state machine
 * The user selects entities, then picks the rotation origin and the start of the angle
 * The selection is rotated by the angle: start angle point => rotation origin => end angle point
 * Typing a number rotates the selection by that many degrees counterclockwise
 */
export const rotateToolStateMachine = createTransformToolStateMachine({
	tool: Tool.ROTATE,
	verb: 'rotate',
	pointInstructions: [
		'Select the origin of the rotation',
		'Select the start of the rotation angle',
		'Select the end of the rotation angle or type an angle in degrees',
	],
	transform: (entities, [rotateOrigin, startAnglePoint, endAnglePoint]) =>
		rotateEntities(entities, rotateOrigin, startAnglePoint, endAnglePoint),
	numberToPoint: (angle, [rotateOrigin, startAnglePoint]) =>
		getPointAtAngle(rotateOrigin, startAnglePoint, angle),
	getGuideEntities: ([rotateOrigin, startAnglePoint, endAnglePoint]) => [
		createGuideLine(rotateOrigin, startAnglePoint),
		createGuideLine(rotateOrigin, endAnglePoint),
	],
});
