import type * as Flatten from '@flatten-js/core';
import { type Box, Point, Polygon, Relations, type Segment, Vector } from '@flatten-js/core';
import { type Edge, type Shape, type SnapPoint, SnapPointType } from '../App.types';
import type { DrawController } from '../drawControllers/DrawController.ts';
import { twoPointBoxToPolygon } from '../helpers/box-to-polygon';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { getExportColor } from '../helpers/get-export-color';
import { getEntityIntersections } from '../helpers/get-intersection-points';
import { mirrorAngleOverAxis } from '../helpers/mirror-angle-over-axis.ts';
import { mirrorPointOverAxis } from '../helpers/mirror-point-over-axis.ts';
import { polygonToSegments } from '../helpers/polygon-to-segments';
import { scalePoint } from '../helpers/scale-point';
import {
	getActiveLayerId,
	isEntityHighlighted,
	isEntitySelected,
	requestRedraw,
} from '../state.ts';
import { type Entity, EntityName, type JsonEntity } from './Entity';
import type { LineEntity } from './LineEntity.ts';

export class ImageEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private imageElement: HTMLImageElement;
	private polygon: Polygon;
	/**
	 * Counterclockwise rotation of the image in radians
	 */
	private angle: number;
	/**
	 * Whether the image is shown as its mirror image
	 * The pixels are flipped upside down before the image is rotated, together with the mirrored angle this gives the mirror image
	 */
	private mirrored = false;

	constructor(
		imgData: HTMLImageElement,
		startPointOrPolygon?: Point | Polygon,
		endPointOrAngle?: Point | number,
		angle = 0
	) {
		this.layerId = getActiveLayerId();
		this.imageElement = imgData;
		if (startPointOrPolygon instanceof Polygon) {
			this.polygon = startPointOrPolygon as Polygon;
		} else {
			this.polygon = twoPointBoxToPolygon(startPointOrPolygon as Point, endPointOrAngle as Point);
		}
		if (endPointOrAngle instanceof Point) {
			this.angle = angle;
		} else {
			this.angle = endPointOrAngle as number;
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
			drawController.drawLine(edge.start, edge.end);
		}

		// The outline of a rotated image is larger than the image, so draw the image at its own size
		const { center, width, height } = this.getImageFrame();
		drawController.drawImage(
			this.imageElement,
			center.x - width / 2,
			center.y - height / 2,
			width,
			height,
			this.angle,
			this.mirrored
		);
	}

	/**
	 * Center, width and height of the image before it is rotated
	 * The outline of the image is a rectangle with one pair of sides along the angle of the image
	 */
	private getImageFrame(): { center: Point; width: number; height: number } {
		const [corner1, corner2, corner3] = this.polygon.vertices;
		const alongImage = new Vector(Math.cos(this.angle), Math.sin(this.angle));
		const acrossImage = alongImage.rotate90CCW();
		const side1 = new Vector(corner1, corner2);
		const side2 = new Vector(corner2, corner3);
		return {
			center: new Point((corner1.x + corner3.x) / 2, (corner1.y + corner3.y) / 2),
			width: Math.abs(side1.dot(alongImage)) + Math.abs(side2.dot(alongImage)),
			height: Math.abs(side1.dot(acrossImage)) + Math.abs(side2.dot(acrossImage)),
		};
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
		this.angle += angle; // Need to keep track of the angle for drawing the image
	}

	public mirror(mirrorAxis: LineEntity) {
		const mirroredVertices = this.polygon.vertices.map((p) => mirrorPointOverAxis(p, mirrorAxis));
		// Mirroring turns the bottom side of the image to the mirrored angle and flips the image upside down along that side
		// Mirroring twice turns the image back to normal
		this.polygon = new Polygon(mirroredVertices);
		this.angle = mirrorAngleOverAxis(this.angle, mirrorAxis);
		this.mirrored = !this.mirrored;
	}

	public clone(): ImageEntity {
		// The image element is never modified, so clones can share it
		const clone = copyEntityBaseProperties(
			this,
			new ImageEntity(this.imageElement, this.polygon.clone(), this.angle)
		);
		clone.mirrored = this.mirrored;
		return clone;
	}

	public intersectsWithBox(selectionBox: Box): boolean {
		return Relations.relate(this.polygon, selectionBox).B2B.length > 0;
	}

	public isContainedInBox(selectionBox: Box): boolean {
		return selectionBox.contains(this.polygon);
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const distanceInfos: [number, Segment][] = polygonToSegments(this.polygon).map((segment) =>
			segment.distanceTo(shape)
		);
		let shortestDistanceInfo: [number, Segment | null] = [Number.MAX_SAFE_INTEGER, null];
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
		return EntityName.Image;
	}

	public containsPointOnShape(point: Flatten.Point): boolean {
		return polygonToSegments(this.polygon).some((segment) => segment.contains(point));
	}

	public async toJson(): Promise<JsonEntity<ImageJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Image,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			lineDash: this.lineDash,
			layerId: this.layerId,
			shapeData: {
				points: this.polygon.vertices.map((vertex) => ({
					x: vertex.x,
					y: vertex.y,
				})),
				imageData: this.imageElement.src,
				angle: this.angle,
				mirrored: this.mirrored,
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<ImageJsonData>): Promise<ImageEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Image: missing shapeData');
		}
		const rectangle = new Polygon(
			jsonEntity.shapeData.points.map((point) => new Point(point.x, point.y))
		);
		const image = new Image();
		// The image is drawn once it is loaded
		image.onload = requestRedraw;
		image.src = jsonEntity.shapeData.imageData;
		const rectangleEntity = new ImageEntity(image, rectangle, jsonEntity.shapeData.angle ?? 0);
		rectangleEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		rectangleEntity.id = jsonEntity.id;
		rectangleEntity.mirrored = jsonEntity.shapeData.mirrored ?? false;
		rectangleEntity.lineColor = jsonEntity.lineColor;
		rectangleEntity.lineWidth = jsonEntity.lineWidth;
		// Drawings saved before the line dash was stored keep the default line dash
		if (jsonEntity.lineDash) {
			rectangleEntity.lineDash = [...jsonEntity.lineDash];
		}
		return rectangleEntity;
	}
}

export interface ImageJsonData {
	points: { x: number; y: number }[];
	/**
	 * Rotation of the image in radians
	 */
	angle?: number;
	/**
	 * Whether the image is shown as its mirror image, drawings saved before images could be mirrored don't have it
	 */
	mirrored?: boolean;
	imageData: string;
}
