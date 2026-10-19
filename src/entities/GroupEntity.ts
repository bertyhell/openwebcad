import { Box, type Point, type Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import { minBy } from 'es-toolkit/compat';
import type { Edge, Shape, SnapPoint } from '../App.types';
import type { DrawController } from '../drawControllers/DrawController';
import { getBoundingBoxOfMultipleEntities } from '../helpers/get-bounding-box-of-multiple-entities.ts';
import { getActiveLayerId, isEntityHighlighted, isEntitySelected } from '../state.ts';
import { type Entity, EntityName, type JsonEntity } from './Entity';
import type { LineEntity } from './LineEntity.ts';

/**
 * A number of entities that are selected, moved, copied, ... as one entity
 * Changing the color, line width or layer of the group changes it for all its members
 */
export class GroupEntity implements Entity {
	public id: string = crypto.randomUUID();
	public readonly entities: Entity[];
	private groupLayerId: string;

	constructor(entities: Entity[]) {
		this.entities = entities;
		this.groupLayerId = entities[0]?.layerId ?? getActiveLayerId();
	}

	public get lineColor(): string {
		return this.entities[0]?.lineColor ?? '#fff';
	}

	public set lineColor(lineColor: string) {
		for (const entity of this.entities) {
			entity.lineColor = lineColor;
		}
	}

	public get lineWidth(): number {
		return this.entities[0]?.lineWidth ?? 1;
	}

	public set lineWidth(lineWidth: number) {
		for (const entity of this.entities) {
			entity.lineWidth = lineWidth;
		}
	}

	public get lineDash(): number[] | undefined {
		return this.entities[0]?.lineDash;
	}

	public set lineDash(lineDash: number[] | undefined) {
		for (const entity of this.entities) {
			entity.lineDash = lineDash ? [...lineDash] : undefined;
		}
	}

	public get layerId(): string {
		return this.groupLayerId;
	}

	public set layerId(layerId: string) {
		this.groupLayerId = layerId;
		for (const entity of this.entities) {
			entity.layerId = layerId;
		}
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

	public clone(): GroupEntity {
		const groupEntity = new GroupEntity(this.entities.map((entity) => entity.clone()));
		groupEntity.layerId = this.layerId;
		return groupEntity;
	}

	public intersectsWithBox(selectionBox: Box): boolean {
		return this.entities.some((entity) => entity.intersectsWithBox(selectionBox));
	}

	public isContainedInBox(selectionBox: Box): boolean {
		return this.entities.every((entity) => entity.isContainedInBox(selectionBox));
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const distanceInfos = compact(this.entities.map((entity) => entity.distanceTo(shape)));
		return minBy(distanceInfos, (distanceInfo) => distanceInfo[0]) ?? null;
	}

	public getBoundingBox(): Box {
		const { minX, minY, maxX, maxY } = getBoundingBoxOfMultipleEntities(this.entities);
		return new Box(minX, minY, maxX, maxY);
	}

	public getShape(): Shape | null {
		return null;
	}

	public getEdges(): Edge[] {
		return this.entities.flatMap((entity) => entity.getEdges());
	}

	public getSnapPoints(): SnapPoint[] {
		return this.entities.flatMap((entity) => entity.getSnapPoints());
	}

	public getIntersections(entity: Entity): Point[] {
		return this.entities.flatMap((groupEntity) => groupEntity.getIntersections(entity));
	}

	public getFirstPoint(): Point | null {
		return this.entities.find((entity) => !!entity.getFirstPoint())?.getFirstPoint() ?? null;
	}

	public getSvgString(): string | null {
		return compact(this.entities.map((entity) => entity.getSvgString())).join('\n');
	}

	public getType(): EntityName {
		return EntityName.Group;
	}

	public containsPointOnShape(point: Point): boolean {
		return this.entities.some((entity) => entity.containsPointOnShape(point));
	}

	public async toJson(): Promise<JsonEntity | null> {
		return {
			id: this.id,
			type: EntityName.Group,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: null,
			children: compact(await Promise.all(this.entities.map((entity) => entity.toJson()))),
		};
	}

	/**
	 * @param jsonEntity
	 * @param childFromJson converts the json of a member into an entity, members can be any type of entity
	 */
	public static async fromJson(
		jsonEntity: JsonEntity<GroupJsonData>,
		childFromJson: (childJson: JsonEntity) => Promise<Entity | null>
	): Promise<GroupEntity | null> {
		const entities = compact(await Promise.all((jsonEntity.children ?? []).map(childFromJson)));
		if (!entities.length) {
			return null;
		}
		const groupEntity = new GroupEntity(entities);
		groupEntity.id = jsonEntity.id;
		groupEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		return groupEntity;
	}
}

/**
 * Replaces groups by their members, also groups inside groups
 */
export function flattenGroups(entities: Entity[]): Entity[] {
	return entities.flatMap((entity) =>
		entity instanceof GroupEntity ? flattenGroups(entity.entities) : [entity]
	);
}

export type GroupJsonData = Record<never, never>;
