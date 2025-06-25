import type * as Flatten from '@flatten-js/core';
import {Box, type Point, type Segment} from '@flatten-js/core';
import {mapLimit} from 'blend-promise-utils';
import {compact, maxBy} from 'es-toolkit';
import {minBy} from 'es-toolkit/compat';
import type {Shape, SnapPoint, StartAndEndpointEntity} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {checkClosedPolygon} from '../helpers/check-closed-polygon.ts';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {ArcEntity, type ArcJsonData} from './ArcEntity.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';
import {LineEntity, type LineJsonData} from './LineEntity.ts';

export class PolyLineEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	public readonly entities: (Entity & StartAndEndpointEntity)[];

	constructor(layerId: string, entities: Entity[]) {
		this.layerId = layerId;
		this.entities = entities.filter((entity) =>
			[EntityName.Line, EntityName.Arc].includes(entity.getType())
		) as StartAndEndpointEntity[];
	}

	public numberOfSegments(): number {
		return this.entities.length;
	}

	public draw(
		drawController: DrawController,
		parentHighlighted?: boolean,
		parentSelected?: boolean
	): void {
		for (const entity of this.entities) {
			entity.draw(
				drawController,
				parentHighlighted ?? isEntityHighlighted(this),
				parentSelected ?? isEntitySelected(this)
			);
		}
	}

	public move(x: number, y: number) {
		for (const entity of this.entities) {
			entity.move(x, y);
		}
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		for (const entity of this.entities) {
			entity.scale(scaleOrigin, scaleFactor);
		}
	}

	public rotate(rotateOrigin: Point, angle: number) {
		for (const entity of this.entities) {
			entity.rotate(rotateOrigin, angle);
		}
	}

	public mirror(mirrorAxis: LineEntity) {
		for (const entity of this.entities) {
			entity.mirror(mirrorAxis);
		}
	}

	public clone(): PolyLineEntity {
		const clonedEntities = this.entities.map((entity) => entity.clone());
		return new PolyLineEntity(this.layerId, clonedEntities);
	}

	public intersectsWithBox(selectionBox: Box): boolean {
		return this.entities.some((entity) => entity.intersectsWithBox(selectionBox));
	}

	public isContainedInBox(selectionBox: Box): boolean {
		return this.entities.every((entity) => entity.isContainedInBox(selectionBox));
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const distanceInfos = this.entities.map((entity) => entity.distanceTo(shape));
		if (distanceInfos.every((distanceInfo) => distanceInfo === null)) {
			return null;
		}
		return minBy(compact(distanceInfos), (distanceInfo) => distanceInfo?.[0]);
	}

	public getBoundingBox(): Box {
		const boundingBoxes = this.entities.map((entity) => entity.getBoundingBox());
		const xmin = minBy(boundingBoxes, (boundingBox) => boundingBox.xmin).xmin;
		const ymin = minBy(boundingBoxes, (boundingBox) => boundingBox.ymin).ymin;
		const xmax = maxBy(boundingBoxes, (boundingBox) => boundingBox.xmax).xmax;
		const ymax = maxBy(boundingBoxes, (boundingBox) => boundingBox.ymax).ymax;
		return new Box(xmin, ymin, xmax, ymax);
	}

	public getShape(): Shape | null {
		return null;
	}

	public getSnapPoints(): SnapPoint[] {
		return this.entities.flatMap((entity) => entity.getSnapPoints());
	}

	public getIntersections(entity: Entity): Point[] {
		return this.entities.flatMap((polyLineEntity) => polyLineEntity.getIntersections(entity));
	}

	public getFirstPoint(): Point | null {
		return this.entities.find((entity) => !!entity.getFirstPoint())?.getFirstPoint() || null;
	}

	public getSvgString(): string | null {
		const svgTexts = this.entities.map((entity) => entity.getSvgString());
		return compact(svgTexts).join('\n');
	}

	public getType(): EntityName {
		return EntityName.PolyLine;
	}

	public containsPointOnShape(point: Flatten.Point): boolean {
		return this.entities.some((entity) => entity.containsPointOnShape(point));
	}

	public async toJson(): Promise<JsonEntity | null> {
		return {
			id: this.id,
			type: EntityName.PolyLine,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: null,
			children: compact(await mapLimit(this.entities, 20, (entity) => entity.toJson())),
		};
	}

	public static async fromJson(
		jsonEntity: JsonEntity<PolyLineJsonData>
	): Promise<PolyLineEntity | null> {
		const entities: (ArcEntity | LineEntity | null)[] = await mapLimit(
			jsonEntity.children || [],
			20,
			async (childEntity: JsonEntity): Promise<LineEntity | ArcEntity | null> => {
				const type = childEntity.type;
				switch (type) {
					case EntityName.Arc:
						return ArcEntity.fromJson(childEntity as JsonEntity<ArcJsonData>);
					case EntityName.Line:
						return LineEntity.fromJson(childEntity as JsonEntity<LineJsonData>);
					// Only arc and lines can be part of a polyline
					// Circle, rectangle can't be used because they are already closed
					// Other entities cannot be used since they are not a valid part of a polyline
					// case EntityName.Rectangle:
					// 	return RectangleEntity.fromJson(childEntity as JsonEntity<RectangleJsonData>);
					// case EntityName.Point:
					// 	return PointEntity.fromJson(childEntity as JsonEntity<PointJsonData>);
					// case EntityName.Image:
					// 	return ImageEntity.fromJson(childEntity as JsonEntity<ImageJsonData>);
					// case EntityName.Measurement:
					// 	return MeasurementEntity.fromJson(childEntity as JsonEntity<MeasurementJsonData>);
					// case EntityName.ArrowHead:
					// 	return ArrowHeadEntity.fromJson(childEntity as JsonEntity<ArrowHeadJsonData>);
					// case EntityName.Text:
					// 	return TextEntity.fromJson(childEntity as JsonEntity<TextJsonData>);
					default:
						return null;
				}
			}
		);

		const closedEntities = checkClosedPolygon(compact(entities));
		if (!closedEntities) {
			return null;
		}
		const polyLineEntity = new PolyLineEntity(
			jsonEntity.layerId || getActiveLayerId(),
			closedEntities as unknown as Entity[]
		);
		polyLineEntity.id = jsonEntity.id;
		polyLineEntity.lineColor = jsonEntity.lineColor;
		polyLineEntity.lineWidth = jsonEntity.lineWidth;
		return polyLineEntity;
	}
}

export type PolyLineJsonData = Record<never, never>;
