import type * as Flatten from '@flatten-js/core';
import {type Box, Point, Polygon, Relations, type Segment, Vector} from '@flatten-js/core';
import {type Shape, type SnapPoint, SnapPointType} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {twoPointBoxToPolygon} from '../helpers/box-to-polygon';
import {getExportColor} from '../helpers/get-export-color';
import {mirrorPointOverAxis} from "../helpers/mirror-point-over-axis.ts";
import {polygonToSegments} from '../helpers/polygon-to-segments';
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';
import type {LineEntity} from "./LineEntity.ts";

export class RectangleEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private polygon: Polygon;

	constructor(layerId: string, startPointOrPolygon?: Point | Polygon, endPoint?: Point) {
		this.layerId = layerId;
		if (startPointOrPolygon instanceof Polygon) {
			this.polygon = startPointOrPolygon as Polygon;
		} else {
			this.polygon = twoPointBoxToPolygon(startPointOrPolygon as Point, endPoint as Point);
		}
	}

	public draw(drawController: DrawController, highlighted?: boolean, selected?: boolean): void {
		drawController.setLineStyles(
			highlighted ?? isEntityHighlighted(this),
			selected ?? isEntitySelected(this),
			this.lineColor,
			this.lineWidth,
			this.lineDash
		);
		for (const edge of polygonToSegments(this.polygon)) {
			const startPoint = new Point(edge.start.x, edge.start.y);
			const endPoint = new Point(edge.end.x, edge.end.y);
			drawController.drawLine(startPoint, endPoint);
		}
	}

	public move(x: number, y: number) {
		this.polygon = this.polygon.translate(new Vector(x, y));
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		const center = this.polygon.box.center;
		const newCenter = scalePoint(center, scaleOrigin, scaleFactor);
		this.polygon = this.polygon.translate(
			new Vector(newCenter.x - center.x, newCenter.y - center.y)
		);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.polygon = this.polygon.rotate(angle, rotateOrigin);
	}

	public mirror(mirrorAxis: LineEntity) {
		const mirroredVertices = this.polygon.vertices.map((p) => mirrorPointOverAxis(p, mirrorAxis));
		this.polygon = new Polygon(mirroredVertices);
	}

	public clone(): RectangleEntity {
		return new RectangleEntity(getActiveLayerId(), this.polygon.clone());
	}

	public intersectsWithBox(selectionBox: Box): boolean {
		return Relations.relate(this.polygon, selectionBox).B2B.length > 0;
	}

	public isContainedInBox(selectionBox: Box): boolean {
		return selectionBox.contains(this.polygon);
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const distanceInfos: [number, Segment][] = polygonToSegments(this.polygon).map((segment) => {
			return segment.distanceTo(shape);
		});
		let shortestDistanceInfo: [number, Segment | null] = [Number.MAX_VALUE, null];
		for (const distanceInfo of distanceInfos) {
			if (distanceInfo[0] < shortestDistanceInfo[0]) {
				shortestDistanceInfo = distanceInfo;
			}
		}
		return shortestDistanceInfo as [number, Segment];
	}

	public getBoundingBox(): Box {
		return this.polygon.box;
	}

	public getShape(): Shape | null {
		return this.polygon;
	}

	public getSnapPoints(): SnapPoint[] {
		const corners = this.polygon.vertices;
		const edges = polygonToSegments(this.polygon);
		return [
			{
				point: corners[0],
				type: SnapPointType.LineEndPoint,
			},
			{
				point: corners[1],
				type: SnapPointType.LineEndPoint,
			},
			{
				point: corners[2],
				type: SnapPointType.LineEndPoint,
			},
			{
				point: corners[3],
				type: SnapPointType.LineEndPoint,
			},
			{
				point: edges[0].middle(),
				type: SnapPointType.LineMidPoint,
			},
			{
				point: edges[1].middle(),
				type: SnapPointType.LineMidPoint,
			},
			{
				point: edges[2].middle(),
				type: SnapPointType.LineMidPoint,
			},
			{
				point: edges[3].middle(),
				type: SnapPointType.LineMidPoint,
			},
		];
	}

	public getIntersections(entity: Entity): Point[] {
		const otherShape = entity.getShape();
		if (!otherShape) {
			return [];
		}
		return polygonToSegments(this.polygon).flatMap((segment) => {
			return segment.intersect(otherShape);
		});
	}

	public getFirstPoint(): Point | null {
		return this.polygon?.vertices[0] || null;
	}

	public getSvgString(): string | null {
		return this.polygon.svg({
			strokeWidth: this.lineWidth,
			stroke: getExportColor(this.lineColor),
		});
	}

	public getType(): EntityName {
		return EntityName.Rectangle;
	}

	public containsPointOnShape(point: Flatten.Point): boolean {
		return polygonToSegments(this.polygon).some((segment) => segment.contains(point));
	}

	public async toJson(): Promise<JsonEntity<RectangleJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Rectangle,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				points: this.polygon.vertices.map((vertex) => ({
					x: vertex.x,
					y: vertex.y,
				})),
			},
		};
	}

	public static async fromJson(
		jsonEntity: JsonEntity<RectangleJsonData>
	): Promise<RectangleEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Rectangle: missing shapeData');
		}
		const rectangle = new Polygon(
			jsonEntity.shapeData.points.map((point) => new Point(point.x, point.y))
		);
		const rectangleEntity = new RectangleEntity(
			jsonEntity.layerId || getActiveLayerId(),
			rectangle
		);
		rectangleEntity.id = jsonEntity.id;
		rectangleEntity.lineColor = jsonEntity.lineColor;
		rectangleEntity.lineWidth = jsonEntity.lineWidth;
		return rectangleEntity;
	}
}

export interface RectangleJsonData {
	points: { x: number; y: number }[];
}
