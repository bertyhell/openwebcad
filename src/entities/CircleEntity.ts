import {type Box, Circle, Point, type Segment} from '@flatten-js/core';
import {type Shape, type SnapPoint, SnapPointType} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {getExportColor} from '../helpers/get-export-color';
import {mirrorPointOverAxis} from '../helpers/mirror-point-over-axis.ts';
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';
import type {LineEntity} from './LineEntity.ts';

export class CircleEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private circle: Circle;

	constructor(layerId: string, centerPointOrCircle?: Point | Circle, radius?: number) {
		this.layerId = layerId;
		if (centerPointOrCircle instanceof Circle) {
			this.circle = centerPointOrCircle as Circle;
		} else {
			this.circle = new Circle(centerPointOrCircle as Point, radius as number);
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
		drawController.drawArc(this.circle.center, this.circle.r, 0, 2 * Math.PI, false);
	}

	public move(x: number, y: number) {
		if (this.circle) {
			this.circle = this.circle?.translate(x, y);
		}
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		const center = scalePoint(this.circle.center, scaleOrigin, scaleFactor);
		this.circle = new Circle(center, this.circle.r.valueOf() * scaleFactor);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.circle = this.circle.rotate(angle, rotateOrigin);
	}

	public mirror(mirrorAxis: LineEntity) {
		const mirroredCenter = mirrorPointOverAxis(this.circle.center, mirrorAxis);
		mirrorAxis.getAngle();
		this.circle = new Circle(mirroredCenter, this.circle.r.valueOf());
	}

	public clone(): Entity {
		if (this.circle) {
			return new CircleEntity(getActiveLayerId(), this.circle.clone());
		}
		return this;
	}

	public intersectsWithBox(box: Box): boolean {
		if (!this.circle) {
			return false;
		}
		return this.circle.intersect(box).length > 0;
	}

	public isContainedInBox(box: Box): boolean {
		if (!this.circle) {
			return false;
		}
		return box.contains(this.circle);
	}

	public getBoundingBox(): Box {
		return this.circle.box;
	}

	public getShape(): Shape | null {
		return this.circle;
	}

	public getSnapPoints(): SnapPoint[] {
		if (!this.circle?.center) {
			return [];
		}
		return [
			{
				point: this.circle.center,
				type: SnapPointType.CircleCenter,
			},
			{
				point: new Point(this.circle.center.x + this.circle.r, this.circle.center.y),
				type: SnapPointType.CircleCardinal,
			},
			{
				point: new Point(this.circle.center.x - this.circle.r, this.circle.center.y),
				type: SnapPointType.CircleCardinal,
			},
			{
				point: new Point(this.circle.center.x, this.circle.center.y + this.circle.r),
				type: SnapPointType.CircleCardinal,
			},
			{
				point: new Point(this.circle.center.x, this.circle.center.y - this.circle.r),
				type: SnapPointType.CircleCardinal,
			},
			// TODO add tangent points from mouse location to circle
		];
	}

	public getIntersections(entity: Entity): Point[] {
		const otherShape = entity.getShape();
		if (!this.circle || !otherShape) {
			return [];
		}
		return this.circle.intersect(otherShape);
	}

	public getFirstPoint(): Point | null {
		return this.circle.center;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		if (!this.circle) {
			return null;
		}
		return this.circle.distanceTo(shape);
	}

	public getSvgString(): string | null {
		return (
			this.circle.svg({
				strokeWidth: this.lineWidth,
				stroke: getExportColor(this.lineColor),
			}) || null
		);
	}

	public getType(): EntityName {
		return EntityName.Circle;
	}

	public containsPointOnShape(point: Point): boolean {
		if (!this.circle) {
			return false;
		}
		return this.circle.contains(point);
	}

	public async toJson(): Promise<JsonEntity<CircleJsonData> | null> {
		if (!this.circle) {
			return null;
		}
		return {
			id: this.id,
			type: EntityName.Circle,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				center: { x: this.circle.center.x, y: this.circle.center.y },
				radius: this.circle?.r,
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<CircleJsonData>): Promise<CircleEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Circle: missing shapeData');
		}
		const center = new Point(jsonEntity.shapeData.center.x, jsonEntity.shapeData.center.y);
		const radius = jsonEntity.shapeData.radius;
		const circleEntity = new CircleEntity(jsonEntity.layerId || getActiveLayerId(), center, radius);
		circleEntity.id = jsonEntity.id;
		circleEntity.lineColor = jsonEntity.lineColor;
		circleEntity.lineWidth = jsonEntity.lineWidth;
		return circleEntity;
	}

	public getRadius(): number {
		return this.circle?.r ?? 0;
	}
}

export interface CircleJsonData {
	center: { x: number; y: number };
	radius: number;
}
