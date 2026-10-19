import { Tool } from '../tools';
import { alignEntities } from './align-tool.helpers.ts';
import { createGuideLine, createTransformToolStateMachine } from './transform-tool.helpers';

/**
 * Align tool state machine
 * The user selects entities, then picks 2 pairs of source and destination points
 * The selection is moved from the first source point to the first destination point,
 * and rotated so the second source point lies in the direction of the second destination point
 */
export const alignToolStateMachine = createTransformToolStateMachine({
	tool: Tool.ALIGN,
	verb: 'align',
	pointInstructions: [
		'Select the first source point',
		'Select the first destination point',
		'Select the second source point',
		'Select the second destination point',
	],
	transform: (entities, [source1, destination1, source2, destination2]) =>
		alignEntities(entities, source1, destination1, source2, destination2),
	getGuideEntities: ([source1, destination1, source2, destination2]) => [
		createGuideLine(source1, destination1),
		createGuideLine(source2, destination2),
	],
});
