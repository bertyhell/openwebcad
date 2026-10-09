import type { Box, Point, Segment } from '@flatten-js/core';
import { mapLimit } from 'blend-promise-utils';
import { compact, minBy } from 'es-toolkit';
import type { Edge, Shape, SnapPoint } from '../App.types';
import type { DrawController } from '../drawControllers/DrawController.ts';
import { getActiveLayerId, isEntityHighlighted, isEntitySelected } from '../state.ts';
import { type Entity, EntityName, type JsonEntity } from './Entity';
import type { LineEntity } from './LineEntity.ts';
import { PolyLineEntity, type PolyLineJsonData } from './PolyLineEntity.ts';

/**
 * Area enclosed by a closed boundary filled with a color
 * Holes inside the boundary are not filled
 */
export class FillEntity implements Entity {
	public id: string = crypto.randomUUID();
	public fillColor = '#fff';
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private readonly fillBorder: PolyLineEntity;
	private readonly holes: PolyLineEntity[];

	constructor(fillBorder: PolyLineEntity, holes: PolyLineEntity[] = []) {
		this.layerId = getActiveLayerId();
		this.fillBorder = fillBorder;
		this.holes = holes;
	}

	public draw(
		drawController: DrawController,
		parentHighlighted?: boolean,
		parentSelected?: boolean
	): void {
		const isHighlighted = parentHighlighted ?? isEntityHighlighted(this);
		const isSelected = parentSelected ?? isEntitySelected(this);

		drawController.setFillStyles(this.fillColor);
		drawController.fillPolyline(this.fillBorder, this.holes);

		// Draw the outline so the user can see the fill is highlighted or selected
		if (isHighlighted || isSelected) {
			for (const polyline of this.getPolylines()) {
				polyline.lineColor = this.lineColor;
				polyline.lineWidth = this.lineWidth;
				polyline.lineDash = this.lineDash;
				polyline.draw(drawController, isHighlighted, isSelected);
			}
		}
	}

	public move(x: number, y: number) {
		for (const polyline of this.getPolylines()) {
			polyline.move(x, y);
		}
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		for (const polyline of this.getPolylines()) {
			polyline.scale(scaleOrigin, scaleFactor);
		}
	}

	public rotate(rotateOrigin: Point, angle: number) {
		for (const polyline of this.getPolylines()) {
			polyline.rotate(rotateOrigin, angle);
		}
	}

	public mirror(mirrorAxis: LineEntity) {
		for (const polyline of this.getPolylines()) {
			polyline.mirror(mirrorAxis);
		}
	}

	public clone(): FillEntity {
		const fillEntity = new FillEntity(
			this.fillBorder.clone(),
			this.holes.map((hole) => hole.clone())
		);
		fillEntity.layerId = this.layerId;
		fillEntity.fillColor = this.fillColor;
		fillEntity.lineColor = this.lineColor;
		fillEntity.lineWidth = this.lineWidth;
		return fillEntity;
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
		return null;
	}

	public getEdges(): Edge[] {
		return this.getPolylines().flatMap((polyline) => polyline.getEdges());
	}

	public getSnapPoints(): SnapPoint[] {
		return this.getPolylines().flatMap((polyline) => polyline.getSnapPoints());
	}

	public getIntersections(entity: Entity): Point[] {
		return this.getPolylines().flatMap((polyline) => polyline.getIntersections(entity));
	}

	public getFirstPoint(): Point | null {
		return null;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const distanceInfos = compact(
			this.getPolylines().map((polyline) => polyline.distanceTo(shape))
		);
		return minBy(distanceInfos, (distanceInfo) => distanceInfo[0]) || null;
	}

	public getSvgString(): string | null {
		return this.fillBorder.getSvgString() || null;
	}

	public getType(): EntityName {
		return EntityName.Fill;
	}

	public containsPointOnShape(point: Point): boolean {
		return this.getPolylines().some((polyline) => polyline.containsPointOnShape(point));
	}

	public async toJson(): Promise<JsonEntity<FillJsonData> | null> {
		const fillBorderJson = await this.fillBorder.toJson();
		if (!fillBorderJson) {
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
				fillBorderPolyline: fillBorderJson as JsonEntity<PolyLineJsonData>,
				holePolylines: compact(
					await mapLimit(this.holes, 20, (hole) => hole.toJson())
				) as JsonEntity<PolyLineJsonData>[],
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

		const fillBorder = await PolyLineEntity.fromJson(jsonEntity.shapeData.fillBorderPolyline);
		if (!fillBorder) {
			throw new Error('Invalid fill border entity');
		}
		const holes = compact(
			await mapLimit(jsonEntity.shapeData.holePolylines || [], 20, (holeJson) =>
				PolyLineEntity.fromJson(holeJson)
			)
		);

		const fillEntity = new FillEntity(fillBorder, holes);
		fillEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		fillEntity.id = jsonEntity.id;
		fillEntity.lineColor = jsonEntity.lineColor;
		fillEntity.lineWidth = jsonEntity.lineWidth;
		fillEntity.fillColor = jsonEntity.shapeData.fillColor;
		return fillEntity;
	}

	private getPolylines(): PolyLineEntity[] {
		return [this.fillBorder, ...this.holes];
	}
}

export interface FillJsonData {
	fillColor: string;
	fillBorderPolyline: JsonEntity<PolyLineJsonData>;
	holePolylines?: JsonEntity<PolyLineJsonData>[];
}
