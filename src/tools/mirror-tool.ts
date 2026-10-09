import { LineEntity } from '../entities/LineEntity';
import { Tool } from '../tools';
import { createGuideLine, createTransformToolStateMachine } from './transform-tool.helpers';

/**
 * Length of the dashed mirror axis that is drawn while previewing, the axis itself is infinite
 */
const MIRROR_AXIS_GUIDE_LENGTH = 100_000;

/**
 * Mirror tool state machine
 * The user selects entities, then picks two points of the mirror axis
 * A mirrored copy of the selection is added, the originals are kept
 */
export const mirrorToolStateMachine = createTransformToolStateMachine({
	tool: Tool.MIRROR,
	verb: 'mirror',
	pointInstructions: [
		'Select the first point of the mirror axis',
		'Select the second point of the mirror axis',
	],
	keepOriginals: true,
	transform: (entities, [axisStart, axisEnd]) => {
		if (axisStart.equalTo(axisEnd)) {
			return; // An axis needs two different points
		}
		const mirrorAxis = new LineEntity(axisStart, axisEnd);
		for (const entity of entities) {
			entity.mirror(mirrorAxis);
		}
	},
	getGuideEntities: ([axisStart, axisEnd]) => {
		if (axisStart.equalTo(axisEnd)) {
			return [];
		}
		const direction = axisEnd.translate(-axisStart.x, -axisStart.y);
		const length = Math.hypot(direction.x, direction.y);
		const scale = MIRROR_AXIS_GUIDE_LENGTH / length;
		return [
			createGuideLine(
				axisStart.translate(-direction.x * scale, -direction.y * scale),
				axisStart.translate(direction.x * scale, direction.y * scale)
			),
		];
	},
});
