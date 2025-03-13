import {Tool} from '../tools';
import {createMachine} from 'xstate';
import {BoundingBox} from "../helpers/get-bounding-box-of-multiple-entities.ts";
import {GET_ALIGN_ACTION, GET_ALIGN_TOOL_STATE} from "./align-tool.helpers.ts";
import {Entity} from "../entities/Entity.ts";
import {middle} from "../helpers/middle.ts";

/**
 * AlignCenterHorizontal tool state machine
 * This state machine is responsible for aligning entities on the canvas
 * It uses the select tool state machine to select entities to align
 * When the user presses enter, the selected entities are center horizontal aligned
 */
export const alignCenterHorizontalToolStateMachine = createMachine(
    GET_ALIGN_TOOL_STATE(Tool.ALIGN_CENTER_HORIZONTAL),
    GET_ALIGN_ACTION((entity: Entity, boundingBox: BoundingBox) => {
        const entityBoundingBox = entity.getBoundingBox();
        const centerBoundingBoxX = middle(boundingBox.minX, boundingBox.maxX);
        const centerEntityX = middle(entityBoundingBox.xmin, entityBoundingBox.xmax);
      entity.move(centerBoundingBoxX - centerEntityX, 0);
    })
);
