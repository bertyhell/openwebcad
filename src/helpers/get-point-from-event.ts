import {
  ActorEvent,
  MouseClickEvent,
  NumberInputEvent,
  PointInputEvent,
} from '../tools/tool.types.ts';
import { Point, Vector } from '@flatten-js/core';

/**
 * Various tools need to convert user input into a point
 * This function handles mouse click event, number events and in the future absoluteCoordinates and relativeCoordinate events
 * @param startPoint
 * @param event
 */
export function getPointFromEvent(
  startPoint: Point,
  event: PointInputEvent,
): Point {
  if (event.type === 'NUMBER_INPUT') {
    const distance = (event as NumberInputEvent).value;
    // Direction indicated by the startPoint and the mouse location
    const direction = new Vector(
      event.worldClickPoint.x - startPoint.x,
      event.worldClickPoint.y - startPoint.y,
    );
    const unitDirection = direction.normalize();
    return startPoint.translate(unitDirection.multiply(distance));
  } else if (event.type === 'MOUSE_CLICK') {
    return (event as MouseClickEvent).worldClickPoint;
  } else if (event.type === ActorEvent.ABSOLUTE_POINT_INPUT) {
    // TODO
    throw Error('not yet implemented ABSOLUTE_POINT_INPUT handling');
  } else if (event.type === ActorEvent.RELATIVE_POINT_INPUT) {
    // TODO
    throw Error('not yet implemented RELATIVE_POINT_INPUT handling');
  } else {
    throw new Error(
      'Received unexpected event type in DRAW_FINAL_LINE of LineEntity',
    );
  }
}
