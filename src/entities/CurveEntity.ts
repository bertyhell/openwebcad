import { Box, type Point, Polygon, Segment } from '@flatten-js/core';
import { compact } from 'es-toolkit';
import { minBy } from 'es-toolkit/compat';
import type { Edge, Shape, SnapPoint } from '../App.types';
import type { DrawController } from '../drawControllers/DrawController';
import { isPointEqual } from '../helpers/is-point-equal.ts';
import { mirrorPointOverAxis } from '../helpers/mirror-point-over-axis.ts';
import { scalePoint } from '../helpers/scale-point.ts';
import { getActiveLayerId, isEntityHighlighted, isEntitySelected } from '../state.ts';
import type { Entity, EntityName, JsonEntity } from './Entity';
import type { LineEntity } from './LineEntity.ts';

/**
 * Base class for curves that can't be represented exactly by flatten js shapes. eg: ellipse, spline
 * The curve is defined exactly by its subclass, but drawn, intersected and selected using short segments that follow the curve
 */
export abstract class CurveEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] | undefined = undefined;
	public layerId: string;

	private segmentsCache: Segment[] | null = null;

	protected constructor() {
		this.layerId = getActiveLayerId();
	}

	/**
	 * Points along the curve, the segments between these points are used to approximate the curve
	 */
	public abstract getApproximationPoints(): Point[];

	/**
	 * Whether the last point connects back to the first point
	 */
	public abstract isClosed(): boolean;

	/**
	 * Apply a transformation to the points that define the curve
	 */
	protected abstract transformDefinitionPoints(transform: (point: Point) => Point): void;

	public abstract clone(): Entity;
	public abstract getSnapPoints(): SnapPoint[];
	public abstract getType(): EntityName;
	public abstract toJson(): Promise<JsonEntity | null>;

	private transform(transformPoint: (point: Point) => Point): void {
		this.transformDefinitionPoints(transformPoint);
		this.segmentsCache = null;
	}

	public move(x: number, y: number): void {
		this.transform((point) => point.translate(x, y));
	}

	public scale(scaleOrigin: Point, scaleFactor: number): void {
		this.transform((point) => scalePoint(point, scaleOrigin, scaleFactor));
	}

	public rotate(rotateOrigin: Point, angle: number): void {
		this.transform((point) => point.rotate(angle, rotateOrigin));
	}

	public mirror(mirrorAxis: LineEntity): void {
		this.transform((point) => mirrorPointOverAxis(point, mirrorAxis));
	}

	public getSegments(): Segment[] {
		if (!this.segmentsCache) {
			const points = this.getApproximationPoints();
			const segments: Segment[] = [];
			for (let i = 0; i < points.length - 1; i++) {
				segments.push(new Segment(points[i], points[i + 1]));
			}
			if (this.isClosed() && points.length > 2) {
				segments.push(new Segment(points[points.length - 1], points[0]));
			}
			this.segmentsCache = segments.filter((segment) => segment.length > 0);
		}
		return this.segmentsCache;
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
		for (const segment of this.getSegments()) {
			drawController.drawLine(segment.start, segment.end);
		}
	}

	public intersectsWithBox(box: Box): boolean {
		return this.getSegments().some((segment) => segment.intersect(box).length > 0);
	}

	public isContainedInBox(box: Box): boolean {
		return this.getSegments().every((segment) => box.contains(segment));
	}

	public getBoundingBox(): Box {
		return this.getSegments().reduce(
			(box, segment) => box.merge(segment.box),
			new Box(Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE)
		);
	}

	public getShape(): Shape | null {
		// A closed curve can be used by other entities to find intersections
		return this.isClosed() && this.getSegments().length > 2
			? new Polygon(this.getApproximationPoints())
			: null;
	}

	public getEdges(): Edge[] {
		return this.getSegments();
	}

	public getIntersections(entity: Entity): Point[] {
		const otherShape = entity.getShape();
		if (!otherShape) {
			return [];
		}
		const intersections = this.getSegments().flatMap((segment) => segment.intersect(otherShape));
		// A curve that crosses where two segments meet would otherwise give the same point twice
		return intersections.filter(
			(point, index) =>
				intersections.findIndex((otherPoint) => isPointEqual(point, otherPoint)) === index
		);
	}

	public getFirstPoint(): Point | null {
		return this.getApproximationPoints()[0] ?? null;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const distanceInfos = compact(this.getSegments().map((segment) => segment.distanceTo(shape)));
		return minBy(distanceInfos, (distanceInfo) => distanceInfo[0]) ?? null;
	}

	public getSvgString(): string | null {
		return null;
	}

	public containsPointOnShape(point: Point): boolean {
		return this.getSegments().some((segment) => segment.contains(point));
	}
}
