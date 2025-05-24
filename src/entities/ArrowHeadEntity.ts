import {Box, Point, Segment} from '@flatten-js/core';
import {max, min} from 'es-toolkit/compat';
import type {Shape, SnapPoint} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {mirrorPointOverAxis} from "../helpers/mirror-point-over-axis.ts";
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId} from "../state.ts";
import {type Entity, EntityName, type JsonEntity} from './Entity';
import type {LineEntity} from "./LineEntity.ts";

export class ArrowHeadEntity implements Entity {
	public id: string = crypto.randomUUID();
	public fillColor = '#fff';
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] = [];
	public layerId: string;

	// 3 corners of the arrow head
	constructor(
		layerId: string,
		private p1: Point, // Tip of the arrow
		private p2: Point,
		private p3: Point
	) {
		this.layerId = layerId;
	}

	public draw(drawController: DrawController): void {
		drawController.setLineStyles(false, false, this.lineColor, this.lineWidth, this.lineDash);
		drawController.drawLine(this.p1, this.p2);
		drawController.drawLine(this.p2, this.p3);
		drawController.drawLine(this.p3, this.p1);

		drawController.setFillStyles(this.fillColor);
		drawController.fillPolygon(this.p1, this.p2, this.p3);
	}

	public move(x: number, y: number) {
		this.p1 = this.p1.translate(x, y);
		this.p2 = this.p2.translate(x, y);
		this.p3 = this.p3.translate(x, y);
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		this.p1 = scalePoint(this.p1, scaleOrigin, scaleFactor);
		this.p2 = scalePoint(this.p2, scaleOrigin, scaleFactor);
		this.p3 = scalePoint(this.p3, scaleOrigin, scaleFactor);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.p1 = this.p1.rotate(angle, rotateOrigin);
		this.p2 = this.p2.rotate(angle, rotateOrigin);
		this.p3 = this.p3.rotate(angle, rotateOrigin);
	}

	public mirror(mirrorAxis: LineEntity) {
		this.p1 = mirrorPointOverAxis(this.p1, mirrorAxis);
		this.p2 = mirrorPointOverAxis(this.p2, mirrorAxis);
		this.p3 = mirrorPointOverAxis(this.p3, mirrorAxis);
	}

	public clone(): ArrowHeadEntity {
		return new ArrowHeadEntity(this.layerId, this.p1.clone(), this.p2.clone(), this.p3.clone());
	}

	public intersectsWithBox(box: Box): boolean {
		return (
			new Segment(this.p1, this.p2).intersect(box).length > 0 ||
			new Segment(this.p2, this.p3).intersect(box).length > 0 ||
			new Segment(this.p3, this.p1).intersect(box).length > 0
		);
	}

	public isContainedInBox(box: Box): boolean {
		return box.contains(this.p1) || box.contains(this.p2) || box.contains(this.p3);
	}

	public getBoundingBox(): Box {
		return new Box(
			min([this.p1.x, this.p2.x, this.p3.x]),
			min([this.p1.y, this.p2.y, this.p3.y]),
			max([this.p1.x, this.p2.x, this.p3.x]),
			max([this.p1.y, this.p2.y, this.p3.y])
		);
	}

	public getShape(): Shape | null {
		return null; // TODO see why we need to get the shape out of an entity
	}

	public getSnapPoints(): SnapPoint[] {
		return [];
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public getIntersections(_entity: Entity): Point[] {
		return [];
	}

	public getFirstPoint(): Point | null {
		return this.p1;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		return this.p1.distanceTo(shape);
	}

	public getSvgString(): string | null {
		return null;
	}

	public getType(): EntityName {
		return EntityName.ArrowHead;
	}

	public containsPointOnShape(point: Point): boolean {
		return (
			new Segment(this.p1, this.p2).contains(point) ||
			new Segment(this.p2, this.p3).contains(point) ||
			new Segment(this.p3, this.p1).contains(point)
		);
	}

	public async toJson(): Promise<JsonEntity<ArrowHeadJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.ArrowHead,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				p1: { x: this.p1.x, y: this.p1.y },
				p2: { x: this.p2.x, y: this.p2.y },
				p3: { x: this.p3.x, y: this.p3.y },
			},
		};
	}

	public static async fromJson(
		jsonEntity: JsonEntity<ArrowHeadJsonData>
	): Promise<ArrowHeadEntity> {
		const p1 = new Point(jsonEntity.shapeData.p1.x, jsonEntity.shapeData.p1.y);
		const p2 = new Point(jsonEntity.shapeData.p2.x, jsonEntity.shapeData.p2.y);
		const p3 = new Point(jsonEntity.shapeData.p3.x, jsonEntity.shapeData.p3.y);
		const lineEntity = new ArrowHeadEntity(jsonEntity.layerId || getActiveLayerId(), p1, p2, p3);
		lineEntity.id = jsonEntity.id;
		lineEntity.lineColor = jsonEntity.lineColor;
		lineEntity.lineWidth = jsonEntity.lineWidth;
		return lineEntity;
	}
}

export interface ArrowHeadJsonData {
	p1: { x: number; y: number };
	p2: { x: number; y: number };
	p3: { x: number; y: number };
}
