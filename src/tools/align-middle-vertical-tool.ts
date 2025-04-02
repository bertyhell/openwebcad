import {Tool} from '../tools';
import {createMachine} from 'xstate';
import type {BoundingBox} from "../helpers/get-bounding-box-of-multiple-entities.ts";
import {GET_ALIGN_ACTION, GET_ALIGN_TOOL_STATE} from "./align-tool.helpers.ts";
import type {Entity} from "../entities/Entity.ts";
import {middle} from "../helpers/middle.ts";

/**
 * AlignCenterVertical tool state machine
 * This state machine is responsible for aligning entities on the canvas
 * It uses the select tool state machine to select entities to align
 * When the user presses enter, the selected entities are center vertical aligned
 */
export const alignCenterVerticalToolStateMachine = createMachine(
    GET_ALIGN_TOOL_STATE(Tool.ALIGN_CENTER_VERTICAL),
    GET_ALIGN_ACTION((entity: Entity, boundingBox: BoundingBox) => {
        const entityBoundingBox = entity.getBoundingBox();
        const centerBoundingBoxY = middle(boundingBox.minY, boundingBox.maxY);
        const centerEntityY = middle(entityBoundingBox.ymin, entityBoundingBox.ymax);
      entity.move(0, centerBoundingBoxY - centerEntityY);
    })
);
