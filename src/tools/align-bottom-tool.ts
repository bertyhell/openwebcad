import {Tool} from '../tools';
import {createMachine} from 'xstate';
import {BoundingBox} from "../helpers/get-bounding-box-of-multiple-entities.ts";
import {GET_ALIGN_ACTION, GET_ALIGN_TOOL_STATE} from "./align-tool.helpers.ts";
import {Entity} from "../entities/Entity.ts";

/**
 * AlignBottom tool state machine
 * This state machine is responsible for aligning entities on the canvas
 * It uses the select tool state machine to select entities to align
 * When the user presses enter, the selected entities are bottom aligned
 */
export const alignBottomToolStateMachine = createMachine(
    GET_ALIGN_TOOL_STATE(Tool.ALIGN_BOTTOM),
    GET_ALIGN_ACTION((entity: Entity, boundingBox: BoundingBox) => {
      entity.move(0, boundingBox.minY - entity.getBoundingBox().ymin);
    })
);
