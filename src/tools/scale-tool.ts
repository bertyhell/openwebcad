import { Tool } from '../tools';
import { getPointForScaleFactor, scaleEntities } from './scale-tool.helpers';
import { createGuideLine, createTransformToolStateMachine } from './transform-tool.helpers';

/**
 * Scale tool state machine
 * The user selects entities, then picks the scale origin and the end of a reference length
 * The selection is scaled by: distance origin => mouse / reference length
 * Typing a number scales the selection by that factor
 */
export const scaleToolStateMachine = createTransformToolStateMachine({
	tool: Tool.SCALE,
	verb: 'scale',
	pointInstructions: [
		'Select the origin of the scale operation',
		'Select the end of the reference length',
		'Select the end of the new length or type a scale factor',
	],
	transform: (entities, [origin, referenceEndPoint, newEndPoint]) =>
		scaleEntities(entities, origin, referenceEndPoint, newEndPoint),
	numberToPoint: (scaleFactor, [origin, referenceEndPoint]) =>
		scaleFactor > 0 ? getPointForScaleFactor(origin, referenceEndPoint, scaleFactor) : null,
	getGuideEntities: ([origin, referenceEndPoint, newEndPoint]) => [
		createGuideLine(origin, referenceEndPoint),
		createGuideLine(origin, newEndPoint),
	],
});
