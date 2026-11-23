import type * as Flatten from '@flatten-js/core';
import { type Box, Point, Polygon, Relations, type Segment, Vector } from '@flatten-js/core';
import { type Edge, type Shape, type SnapPoint, SnapPointType } from '../App.types';
import type { DrawController } from '../drawControllers/DrawController';
import { twoPointBoxToPolygon } from '../helpers/box-to-polygon';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { getExportColor } from '../helpers/get-export-color';
import { getEntityIntersections } from '../helpers/get-intersection-points';
import { mirrorPointOverAxis } from '../helpers/mirror-point-over-axis.ts';
import { polygonToSegments } from '../helpers/polygon-to-segments';
import { scalePoint } from '../helpers/scale-point';
import { getActiveLayerId, isEntityHighlighted, isEntitySelected } from '../state.ts';
import { type Entity, EntityName, type JsonEntity } from './Entity';
import type { LineEntity } from './LineEntity.ts';

export class RectangleEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private polygon: Polygon;

	constructor(startPointOrPolygon?: Point | Polygon, endPoint?: Point) {
		this.layerId = getActiveLayerId();
		if (startPointOrPolygon instanceof Polygon) {
			this.polygon = startPointOrPolygon as Polygon;
		} else {
			this.polygon = twoPointBoxToPolygon(startPointOrPolygon as Point, endPoint as Point);
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
		this.polygon = new Polygon(
			this.polygon.vertices.map((vertex) => scalePoint(vertex, scaleOrigin, scaleFactor))
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
		return copyEntityBaseProperties(this, new RectangleEntity(this.polygon.clone()));
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

	public getEdges(): Edge[] {
		return polygonToSegments(this.polygon);
	}

	public getSnapPoints(): SnapPoint[] {
		// A rectangle without a width or height has fewer than 4 corners and edges
		return [
			...this.polygon.vertices.map((corner) => ({
				point: corner,
				type: SnapPointType.LineEndPoint,
			})),
			...polygonToSegments(this.polygon).map((edge) => ({
				point: edge.middle(),
				type: SnapPointType.LineMidPoint,
			})),
		];
	}

	public getIntersections(entity: Entity): Point[] {
		return getEntityIntersections(this, entity);
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
			lineDash: this.lineDash,
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
		const rectangleEntity = new RectangleEntity(rectangle);
		rectangleEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		rectangleEntity.id = jsonEntity.id;
		rectangleEntity.lineColor = jsonEntity.lineColor;
		rectangleEntity.lineWidth = jsonEntity.lineWidth;
		// Drawings saved before the line dash was stored keep the default line dash
		if (jsonEntity.lineDash) {
			rectangleEntity.lineDash = [...jsonEntity.lineDash];
		}
		return rectangleEntity;
	}
}

export interface RectangleJsonData {
	points: { x: number; y: number }[];
}
