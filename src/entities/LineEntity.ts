import {type Box, Point, Segment} from '@flatten-js/core';
import {sortBy, uniqWith} from 'es-toolkit';
import {type Shape, type SnapPoint, SnapPointType, type StartAndEndpointEntity} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {pointDistance} from '../helpers/distance-between-points';
import {getAngleWithXAxis} from '../helpers/get-angle-with-x-axis.ts';
import {getExportColor} from '../helpers/get-export-color';
import {isPointEqual} from '../helpers/is-point-equal';
import {mirrorPointOverAxis} from '../helpers/mirror-point-over-axis.ts';
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';

export class LineEntity implements Entity, StartAndEndpointEntity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private segment: Segment;

	constructor(layerId: string, p1?: Point | Segment, p2?: Point) {
		this.layerId = layerId;
		if (p1 instanceof Segment) {
			this.segment = p1;
		} else {
			this.segment = new Segment(p1, p2);
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
		const startPoint = new Point(this.segment.start.x, this.segment.start.y);
		const endPoint = new Point(this.segment.end.x, this.segment.end.y);
		drawController.drawLine(startPoint, endPoint);
	}

	public move(x: number, y: number) {
		this.segment = this.segment.translate(x, y);
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		const newStart = scalePoint(this.segment.start, scaleOrigin, scaleFactor);
		const newEnd = scalePoint(this.segment.end, scaleOrigin, scaleFactor);
		this.segment = new Segment(newStart, newEnd);
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.segment = this.segment.rotate(angle, rotateOrigin);
	}

	public mirror(mirrorAxis: LineEntity) {
		const mirroredStart = mirrorPointOverAxis(this.segment.start, mirrorAxis);
		const mirroredEnd = mirrorPointOverAxis(this.segment.end, mirrorAxis);
		this.segment = new Segment(mirroredStart, mirroredEnd);
	}

	public clone(): LineEntity {
		return new LineEntity(getActiveLayerId(), this.segment.clone());
	}

	public intersectsWithBox(box: Box): boolean {
		return this.segment.intersect(box).length > 0;
	}

	public isContainedInBox(box: Box): boolean {
		return box.contains(this.segment);
	}

	public getBoundingBox(): Box {
		return this.segment.box;
	}

	public getShape(): Shape | null {
		return this.segment;
	}

	public getSnapPoints(): SnapPoint[] {
		return [
			{
				point: this.segment.start,
				type: SnapPointType.LineEndPoint,
			},
			{
				point: this.segment.end,
				type: SnapPointType.LineEndPoint,
			},
			{
				point: this.segment.middle(),
				type: SnapPointType.LineMidPoint,
			},
		];
	}

	public getIntersections(entity: Entity): Point[] {
		const otherShape = entity.getShape();
		if (!otherShape) {
			return [];
		}
		return this.segment.intersect(otherShape);
	}

	public getFirstPoint(): Point | null {
		return this.segment.start;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		return this.segment.distanceTo(shape);
	}

	public getSvgString(): string | null {
		return (
			this.segment.svg({
				strokeWidth: this.lineWidth,
				stroke: getExportColor(this.lineColor),
			}) || null
		);
	}

	public getType(): EntityName {
		return EntityName.Line;
	}

	public containsPointOnShape(point: Point): boolean {
		return this.segment.contains(point);
	}

	/**
	 * Returns angle of the line with the x-axis in radians
	 */
	public getAngle(): number {
		return getAngleWithXAxis(this.segment.start, this.segment.end);
	}

	/**
	 * Cuts the line at the given points and returns a list of new lines in order from the start point of the original line
	 * @param pointsOnShape
	 */
	public cutAtPoints(pointsOnShape: Point[]): Entity[] {
		const points = uniqWith([this.segment.start, this.segment.end, ...pointsOnShape], isPointEqual);
		const sortLinesByDistanceToStartPoint = sortBy(points, [
			(point: Point): number => pointDistance(this.segment.start, point),
		]);

		// Convert the points back into line segments
		const lineSegments: Entity[] = [];
		// Until length - 2, so we can combine start points with endpoints
		for (let i = 0; i < sortLinesByDistanceToStartPoint.length - 1; i++) {
			lineSegments.push(
				new LineEntity(
					getActiveLayerId(),
					sortLinesByDistanceToStartPoint[i],
					sortLinesByDistanceToStartPoint[i + 1]
				)
			);
		}
		return lineSegments;
	}

	public async toJson(): Promise<JsonEntity<LineJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Line,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				startPoint: {
					x: this.segment.start.x,
					y: this.segment.start.y,
				},
				endPoint: { x: this.segment.end.x, y: this.segment.end.y },
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<LineJsonData>): Promise<LineEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Line: missing shapeData');
		}
		const startPoint = new Point(
			jsonEntity.shapeData.startPoint.x,
			jsonEntity.shapeData.startPoint.y
		);
		const endPoint = new Point(jsonEntity.shapeData.endPoint.x, jsonEntity.shapeData.endPoint.y);
		const lineEntity = new LineEntity(
			jsonEntity.layerId || getActiveLayerId(),
			startPoint,
			endPoint
		);
		lineEntity.id = jsonEntity.id;
		lineEntity.lineColor = jsonEntity.lineColor;
		lineEntity.lineWidth = jsonEntity.lineWidth;
		return lineEntity;
	}

	public getStartPoint(): Point {
		return this.segment.start;
	}

	public getEndPoint(): Point {
		return this.segment.end;
	}
}

export interface LineJsonData {
	startPoint: { x: number; y: number };
	endPoint: { x: number; y: number };
}
