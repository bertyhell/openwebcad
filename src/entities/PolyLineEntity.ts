import type * as Flatten from '@flatten-js/core';
import { Arc, Box, type Point, type Segment } from '@flatten-js/core';
import { mapLimit } from 'blend-promise-utils';
import { compact, maxBy } from 'es-toolkit';
import { minBy } from 'es-toolkit/compat';
import type { Edge, Shape, SnapPoint, StartAndEndpointEntity } from '../App.types';
import type { DrawController } from '../drawControllers/DrawController';
import { checkClosedPolygon } from '../helpers/check-closed-polygon.ts';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { getExportColor } from '../helpers/get-export-color';
import { getEntityIntersections } from '../helpers/get-intersection-points';
import { orderEdgeBoundary } from '../helpers/order-edge-boundary.ts';
import { getActiveLayerId, isEntityHighlighted, isEntitySelected } from '../state.ts';
import { ArcEntity, type ArcJsonData } from './ArcEntity.ts';
import { type Entity, EntityName, type JsonEntity } from './Entity';
import { LineEntity, type LineJsonData } from './LineEntity.ts';

export class PolyLineEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	public readonly entities: (Entity & StartAndEndpointEntity)[];

	constructor(entities: Entity[]) {
		this.layerId = getActiveLayerId();
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
		// The segments are drawn in the style of the polyline without changing the segments,
		// so segments that are shared with other code (eg: the undo history) keep their own style
		drawController.setLineStyles(
			parentHighlighted ?? isEntityHighlighted(this),
			parentSelected ?? isEntitySelected(this),
			this.lineColor,
			this.lineWidth,
			this.lineDash
		);
		for (const edge of this.getEdges()) {
			if (edge instanceof Arc) {
				drawController.drawArc(
					edge.center,
					edge.r.valueOf(),
					edge.startAngle,
					edge.endAngle,
					edge.counterClockwise
				);
			} else {
				drawController.drawLine(edge.start, edge.end);
			}
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
		return copyEntityBaseProperties(this, new PolyLineEntity(clonedEntities));
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
		return minBy(compact(distanceInfos), (distanceInfo) => distanceInfo[0]) || null;
	}

	public getBoundingBox(): Box {
		const boundingBoxes = this.entities.map((entity) => entity.getBoundingBox());
		const xmin = minBy(boundingBoxes, (boundingBox) => boundingBox.xmin)?.xmin;
		const ymin = minBy(boundingBoxes, (boundingBox) => boundingBox.ymin)?.ymin;
		const xmax = maxBy(boundingBoxes, (boundingBox) => boundingBox.xmax)?.xmax;
		const ymax = maxBy(boundingBoxes, (boundingBox) => boundingBox.ymax)?.ymax;
		return new Box(xmin, ymin, xmax, ymax);
	}

	public getShape(): Shape | null {
		return null;
	}

	public getEdges(): Edge[] {
		return this.entities.flatMap((entity) => {
			return entity.getEdges();
		});
	}

	/**
	 * Returns the edges of the polyline in order, where every edge starts where the previous edge ended
	 * This is useful for drawing the polyline as a single path
	 */
	public getOrderedEdges(): Edge[] {
		const edges = this.getEdges();
		try {
			return orderEdgeBoundary(edges);
		} catch {
			// Polyline isn't closed, return the edges in their original order
			return edges;
		}
	}

	public getSnapPoints(): SnapPoint[] {
		return this.entities.flatMap((entity) => entity.getSnapPoints());
	}

	public getIntersections(entity: Entity): Point[] {
		return getEntityIntersections(this, entity);
	}

	public getFirstPoint(): Point | null {
		return this.entities.find((entity) => !!entity.getFirstPoint())?.getFirstPoint() || null;
	}

	public getSvgString(): string | null {
		// Like when drawing, the segments use the style of the polyline
		const svgTexts = this.getEdges().map((edge) =>
			edge.svg({ strokeWidth: this.lineWidth, stroke: getExportColor(this.lineColor) })
		);
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
			lineDash: this.lineDash,
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

		const segments = compact(entities);
		if (segments.length === 0) {
			return null;
		}
		// Closed polylines are ordered so each segment's end meets the next segment's start
		// Open polylines are kept in the order they were saved in, which is the order they were drawn in
		const orderedSegments = checkClosedPolygon(segments) ?? segments;
		const polyLineEntity = new PolyLineEntity(orderedSegments as unknown as Entity[]);
		polyLineEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		polyLineEntity.id = jsonEntity.id;
		polyLineEntity.lineColor = jsonEntity.lineColor;
		polyLineEntity.lineWidth = jsonEntity.lineWidth;
		// Drawings saved before the line dash was stored keep the default line dash
		if (jsonEntity.lineDash) {
			polyLineEntity.lineDash = [...jsonEntity.lineDash];
		}
		return polyLineEntity;
	}
}

export type PolyLineJsonData = Record<never, never>;
