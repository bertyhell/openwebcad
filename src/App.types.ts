import type { Arc, Circle, Point, Polygon, Segment } from '@flatten-js/core';
import type { Entity } from './entities/Entity.ts';

export type Shape = Polygon | Segment | Point | Circle | Arc;

export enum SnapPointType {
	AngleGuide = 'AngleGuide',
	LineEndPoint = 'LineEndPoint',
	Intersection = 'Intersection',
	CircleCenter = 'CircleCenter',
	CircleCardinal = 'CircleCardinal',
	CircleTangent = 'CircleTangent',
	LineMidPoint = 'LineMidPoint',
	Point = 'Point',
}

export interface SnapPoint {
	point: Point;
	type: SnapPointType;
}

export type SnapPointConfig = Record<SnapPointType, boolean>;

export interface HoverPoint {
	snapPoint: SnapPoint;
	milliSecondsHovered: number;
}

export enum MouseButton {
	Left = 0, // Main button pressed, usually the left button or the un-initialized state
	Middle = 1, // Auxiliary button pressed, usually the wheel button or the middle button (if present)
	Right = 2, // Secondary button pressed, usually the right button
	Back = 3, // Fourth button, typically the Browser Back button
	Forward = 4, // Fifth button, typically the Browser Forward button
}

export enum HtmlEvent {
	UPDATE_STATE = 'UPDATE_STATE',
	TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR',
	DRAWING_CHANGED = 'DRAWING_CHANGED',
}

export interface StateMetaData {
	instructions: string;
}

export interface Layer {
	id: string;
	name: string;
	isVisible: boolean;
	isLocked: boolean;
	/**
	 * Line color for new entities drawn on this layer, when not set the active line color is used
	 */
	color?: string;
}

export enum LOCAL_STORAGE_KEY {
	DRAWING = 'OPEN_WEB_CAD__DRAWING',
	SIDEBAR = 'OPEN_WEB_CAD__SIDEBAR',
}

export interface StartAndEndpointEntity extends Entity {
	getStartPoint(): Point;
	getEndPoint(): Point;
}

export interface BoundingBox {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export type VertexId = string;
export type EdgeId = string;
export type Edge = Segment | Arc;
export type EdgeWithId = Edge & { id: EdgeId };
