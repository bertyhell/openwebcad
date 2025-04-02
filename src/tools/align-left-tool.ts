import {Tool} from '../tools';
import {createMachine} from 'xstate';
import type {BoundingBox} from "../helpers/get-bounding-box-of-multiple-entities.ts";
import {GET_ALIGN_ACTION, GET_ALIGN_TOOL_STATE} from "./align-tool.helpers.ts";
import type {Entity} from "../entities/Entity.ts";

/**
 * AlignLeft tool state machine
 * This state machine is responsible for aligning entities on the canvas
 * It uses the select tool state machine to select entities to align
 * When the user presses enter, the selected entities are left aligned
 */
export const alignLeftToolStateMachine = createMachine(
    GET_ALIGN_TOOL_STATE(Tool.ALIGN_LEFT),
    GET_ALIGN_ACTION((entity: Entity, boundingBox: BoundingBox) => {
      entity.move(boundingBox.minX - entity.getBoundingBox().xmin, 0);
    })
);
