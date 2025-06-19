import type {Box, Point, Segment} from '@flatten-js/core';
import type {Shape, SnapPoint} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController.ts';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';
import type {LineEntity} from './LineEntity.ts';
import {PolyLineEntity, type PolyLineJsonData} from './PolyLineEntity.ts';

export class FillEntity implements Entity {
	public id: string = crypto.randomUUID();
	public fillColor = '#fff';
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash = [];
	public layerId: string;

	private fillBorder: PolyLineEntity;

	constructor(layerId: string, fillBorder: PolyLineEntity) {
		this.layerId = layerId;
		this.fillBorder = fillBorder;
	}

	public draw(
		drawController: DrawController,
		parentHighlighted?: boolean,
		parentSelected?: boolean
	): void {
		drawController.setLineStyles(
			parentHighlighted ?? isEntityHighlighted(this),
			parentSelected ?? isEntitySelected(this),
			this.lineColor,
			this.lineWidth,
			this.lineDash
		);
		drawController.setFillStyles(this.fillColor);
		drawController.fillPolyline(this.fillBorder);
	}

	public move(x: number, y: number) {
		this.fillBorder.move(x, y);
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		this.fillBorder.scale(scaleOrigin, scaleFactor);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.fillBorder.rotate(rotateOrigin, angle);
	}

	public mirror(mirrorAxis: LineEntity) {
		this.fillBorder.mirror(mirrorAxis);
	}

	public clone(): Entity {
		if (this.fillBorder) {
			return new FillEntity(getActiveLayerId(), this.fillBorder.clone());
		}
		return this;
	}

	public intersectsWithBox(box: Box): boolean {
		return this.fillBorder.intersectsWithBox(box);
	}

	public isContainedInBox(box: Box): boolean {
		return this.fillBorder.isContainedInBox(box);
	}

	public getBoundingBox(): Box {
		return this.fillBorder.getBoundingBox();
	}

	public getShape(): Shape | null {
		return this.fillBorder.getShape();
	}

	public getSnapPoints(): SnapPoint[] {
		return this.fillBorder.getSnapPoints();
	}

	public getIntersections(entity: Entity): Point[] {
		return this.fillBorder.getIntersections(entity);
	}

	public getFirstPoint(): Point | null {
		return null;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		return this.fillBorder.distanceTo(shape);
	}

	public getSvgString(): string | null {
		return this.fillBorder.getSvgString() || null;
	}

	public getType(): EntityName {
		return EntityName.Fill;
	}

	public containsPointOnShape(point: Point): boolean {
		return this.fillBorder.containsPointOnShape(point);
	}

	public async toJson(): Promise<JsonEntity<FillJsonData> | null> {
		if (!this.fillBorder) {
			return null;
		}
		return {
			id: this.id,
			type: EntityName.Fill,
			layerId: this.layerId,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			shapeData: {
				fillColor: this.fillColor,
				fillBorderPolyline: this.fillBorder.toJson(),
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<FillJsonData>): Promise<FillEntity> {
		if (jsonEntity.type !== EntityName.Fill) {
			throw new Error('Invalid Entity type in JSON');
		}

		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Fill entity: missing shapeData');
		}

		const layerId = jsonEntity.layerId || getActiveLayerId();
		const fillBorder = await PolyLineEntity.fromJson(jsonEntity);

		if (!fillBorder) {
			throw new Error('Invalid fill border entity');
		}

		const fillEntity = new FillEntity(layerId, fillBorder);
		fillEntity.id = jsonEntity.id;
		fillEntity.fillColor = jsonEntity.shapeData.fillColor;
		return fillEntity;
	}
}

export interface FillJsonData {
	fillBorderPolyline: PolyLineJsonData;
	fillColor: string;
}
