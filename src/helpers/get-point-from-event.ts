import {type Point, Vector} from '@flatten-js/core';
import {
	type AbsolutePointInputEvent,
	ActorEvent,
	type DrawEvent,
	type MouseClickEvent,
	type NumberInputEvent,
	type PointInputEvent,
	type RelativePointInputEvent,
} from '../tools/tool.types.ts';

/**
 * Various tools need to convert user input into a point
 * This function handles mouse click event, number events and in the future absoluteCoordinates and relativeCoordinate events
 * @param startPoint
 * @param event
 */
export function getPointFromEvent(startPoint: Point | null, event: PointInputEvent): Point {
	if (event.type === ActorEvent.DRAW) {
		return (event as DrawEvent).drawController.getWorldMouseLocation();
	}
	if (event.type === ActorEvent.MOUSE_CLICK) {
		return (event as MouseClickEvent).worldMouseLocation;
	}
	if (event.type === ActorEvent.NUMBER_INPUT) {
		if (!startPoint) {
			throw new Error('Cannot get relative point by distance if no start point is provided');
		}
		const distance = (event as NumberInputEvent).value;
		// Direction indicated by the startPoint and the mouse location
		const direction = new Vector(
			event.worldMouseLocation.x - startPoint.x,
			event.worldMouseLocation.y - startPoint.y
		);
		const unitDirection = direction.normalize();
		return startPoint.translate(unitDirection.multiply(distance));
	}
	if (event.type === ActorEvent.ABSOLUTE_POINT_INPUT) {
		return (event as AbsolutePointInputEvent).value;
	}
	if (event.type === ActorEvent.RELATIVE_POINT_INPUT) {
		if (!startPoint) {
			throw new Error('Cannot get relative point by coordinates if no start point is provided');
		}
		const relativeCoordinates = (event as RelativePointInputEvent).value;
		return startPoint.clone().translate(relativeCoordinates.x, relativeCoordinates.y);
	}
	throw new Error('Received unexpected event type in DRAW_FINAL_LINE of LineEntity');
}
