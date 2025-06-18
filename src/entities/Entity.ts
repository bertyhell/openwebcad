import type {Box, Point, Segment} from '@flatten-js/core';
import type {Shape, SnapPoint} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController.ts';
import type {ArcJsonData} from './ArcEntity';
import type {ArrowHeadJsonData} from './ArrowHeadEntity.ts';
import type {CircleJsonData} from './CircleEntity';
import type {ImageJsonData} from './ImageEntity';
import type {LineEntity, LineJsonData} from './LineEntity';
import type {PointJsonData} from './PointEntity';
import type {RectangleJsonData} from './RectangleEntity';
import type {TextJsonData} from './TextEntity.ts';

export interface Entity {
	// Random uuid generated when the Entity is created
	// Used for comparing entities
	id: string;
	lineColor: string;
	lineWidth: number;
	lineDash: number[] | undefined;
	layerId: string;
	draw(drawController: DrawController, highlighted?: boolean, selected?: boolean): void;

	/**
	 * Translate an entity by x and y amount
	 * @param x
	 * @param y
	 */
	move(x: number, y: number): void;
	scale(scaleOrigin: Point, scaleFactor: number): void;
	rotate(rotateOrigin: Point, angle: number): void;
	mirror(mirrorAxis: LineEntity): void;
	clone(): Entity;
	getBoundingBox(): Box;
	intersectsWithBox(box: Box): boolean;
	isContainedInBox(box: Box): boolean;
	getBoundingBox(): Box;
	getFirstPoint(): Point | null;
	getShape(): Shape | null;
	getSnapPoints(): SnapPoint[];
	getIntersections(entity: Entity): Point[];
	distanceTo(shape: Shape): [number, Segment] | null;
	getSvgString(): string | null;
	getType(): EntityName;
	containsPointOnShape(point: Point): boolean;
	toJson(): Promise<JsonEntity | null>;
	// static fromJson(jsonEntity: JsonEntity): Promise<Entity | null>;
}

export enum EntityName {
	Line = 'Line',
	Circle = 'Circle',
	Arc = 'Arc',
	Rectangle = 'Rectangle',
	Point = 'Point',
	Image = 'Image',
	Measurement = 'Measurement',
	ArrowHead = 'ArrowHead',
	Text = 'Text',
	PolyLine = 'PolyLine',
}

export type ShapeJsonData =
	| RectangleJsonData
	| CircleJsonData
	| ArcJsonData
	| LineJsonData
	| PointJsonData
	| ImageJsonData
	| ArrowHeadJsonData
	| TextJsonData;

export interface JsonEntity<TShapeJsonData = ShapeJsonData> {
	id: string;
	type: EntityName;
	lineColor: string;
	lineWidth: number;
	layerId: string;
	shapeData: TShapeJsonData | null;
	children?: JsonEntity<ShapeJsonData>[];
}
