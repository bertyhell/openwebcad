import type * as Flatten from '@flatten-js/core';
import {Box, Point, type Segment} from '@flatten-js/core';
import {type Shape, type SnapPoint, SnapPointType} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {getExportColor} from '../helpers/get-export-color';
import {mirrorPointOverAxis} from '../helpers/mirror-point-over-axis.ts';
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';
import type {LineEntity} from './LineEntity.ts';

export class PointEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	public point: Point;

	constructor(layerId: string, pointOrX?: Point | number, y?: number) {
		this.layerId = layerId;
		if (pointOrX instanceof Point) {
			// Passed point
			this.point = new Point(pointOrX.x, pointOrX.y);
		} else {
			// Passed x and y coordinates
			this.point = new Point(pointOrX as number, y as number);
		}
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
		drawController.drawArc(this.point, 5, 0, Math.PI * 2, false);
	}

	public move(x: number, y: number) {
		this.point = this.point.translate(x, y);
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		this.point = scalePoint(this.point, scaleOrigin, scaleFactor);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.point = this.point.rotate(angle, rotateOrigin);
	}

	public mirror(mirrorAxis: LineEntity) {
		this.point = mirrorPointOverAxis(this.point, mirrorAxis);
	}

	public clone(): PointEntity {
		return new PointEntity(getActiveLayerId(), this.point.clone());
	}

	public intersectsWithBox(): boolean {
		return false;
	}

	public isContainedInBox(box: Box): boolean {
		return box.contains(this.point);
	}

	public getBoundingBox(): Box {
		return new Box(this.point.x, this.point.y, this.point.x, this.point.y);
	}

	public getShape(): Shape | null {
		return this.point;
	}

	public getSnapPoints(): SnapPoint[] {
		return [
			{
				point: this.point,
				type: SnapPointType.Point,
			},
		];
	}

	public getIntersections(): Point[] {
		return [];
	}

	public getFirstPoint(): Point | null {
		return this.point;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		return this.point.distanceTo(shape);
	}

	public getSvgString(): string | null {
		return (
			this.point.svg({
				strokeWidth: this.lineWidth,
				stroke: getExportColor(this.lineColor),
			}) || null
		);
	}

	public getType(): EntityName {
		return EntityName.Point;
	}

	public containsPointOnShape(point: Flatten.Point): boolean {
		return this.point.equalTo(point);
	}

	public async toJson(): Promise<JsonEntity<PointJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Point,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				point: {
					x: this.point.x,
					y: this.point.y,
				},
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<PointJsonData>): Promise<PointEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Point: missing shapeData');
		}
		const point = new Point(jsonEntity.shapeData.point.x, jsonEntity.shapeData.point.y);
		const lineEntity = new PointEntity(jsonEntity.layerId || getActiveLayerId(), point);
		lineEntity.id = jsonEntity.id;
		lineEntity.lineColor = jsonEntity.lineColor;
		lineEntity.lineWidth = jsonEntity.lineWidth;
		return lineEntity;
	}
}

export interface PointJsonData {
	point: {
		x: number;
		y: number;
	};
}
