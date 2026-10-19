import { Point, Vector } from '@flatten-js/core';
import { type SnapPoint, SnapPointType } from '../App.types';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { getActiveLayerId } from '../state.ts';
import { CurveEntity } from './CurveEntity.ts';
import { EntityName, type JsonEntity } from './Entity';

/**
 * Number of segments used to draw and intersect an ellipse
 */
const ELLIPSE_SEGMENT_COUNT = 96;

export class EllipseEntity extends CurveEntity {
	/**
	 * @param center
	 * @param majorAxisEnd end point of the first axis
	 * @param ratio length of the second axis relative to the first axis
	 */
	constructor(
		private center: Point,
		private majorAxisEnd: Point,
		private ratio: number
	) {
		super();
	}

	public getCenter(): Point {
		return this.center;
	}

	public getMajorAxisEnd(): Point {
		return this.majorAxisEnd;
	}

	public getRatio(): number {
		return this.ratio;
	}

	/**
	 * Point on the ellipse at the parameter angle, 0 is the end of the first axis
	 */
	public getPointAt(parameter: number): Point {
		const majorAxis = new Vector(this.center, this.majorAxisEnd);
		const minorAxis = majorAxis.rotate90CCW().multiply(this.ratio);
		return new Point(
			this.center.x + majorAxis.x * Math.cos(parameter) + minorAxis.x * Math.sin(parameter),
			this.center.y + majorAxis.y * Math.cos(parameter) + minorAxis.y * Math.sin(parameter)
		);
	}

	public getApproximationPoints(): Point[] {
		return Array.from({ length: ELLIPSE_SEGMENT_COUNT }, (_, index) =>
			this.getPointAt((index / ELLIPSE_SEGMENT_COUNT) * 2 * Math.PI)
		);
	}

	public isClosed(): boolean {
		return true;
	}

	protected transformDefinitionPoints(transform: (point: Point) => Point): void {
		// The end of the second axis is transformed too, so mirroring keeps the ellipse on the same side
		const minorAxisEnd = transform(this.getPointAt(Math.PI / 2));
		this.center = transform(this.center);
		this.majorAxisEnd = transform(this.majorAxisEnd);
		const majorAxisLength = this.center.distanceTo(this.majorAxisEnd)[0];
		if (majorAxisLength > 0) {
			this.ratio = this.center.distanceTo(minorAxisEnd)[0] / majorAxisLength;
		}
	}

	public clone(): EllipseEntity {
		return copyEntityBaseProperties(
			this,
			new EllipseEntity(this.center.clone(), this.majorAxisEnd.clone(), this.ratio)
		);
	}

	public getSnapPoints(): SnapPoint[] {
		return [
			{ point: this.center, type: SnapPointType.CircleCenter },
			...[0, 0.5, 1, 1.5].map((quarter) => ({
				point: this.getPointAt(quarter * Math.PI),
				type: SnapPointType.CircleCardinal,
			})),
		];
	}

	public getType(): EntityName {
		return EntityName.Ellipse;
	}

	public async toJson(): Promise<JsonEntity<EllipseJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Ellipse,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				center: { x: this.center.x, y: this.center.y },
				majorAxisEnd: { x: this.majorAxisEnd.x, y: this.majorAxisEnd.y },
				ratio: this.ratio,
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<EllipseJsonData>): Promise<EllipseEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Ellipse: missing shapeData');
		}
		const { center, majorAxisEnd, ratio } = jsonEntity.shapeData;
		const ellipseEntity = new EllipseEntity(
			new Point(center.x, center.y),
			new Point(majorAxisEnd.x, majorAxisEnd.y),
			ratio
		);
		ellipseEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		ellipseEntity.id = jsonEntity.id;
		ellipseEntity.lineColor = jsonEntity.lineColor;
		ellipseEntity.lineWidth = jsonEntity.lineWidth;
		return ellipseEntity;
	}
}

export interface EllipseJsonData {
	center: { x: number; y: number };
	majorAxisEnd: { x: number; y: number };
	ratio: number;
}
