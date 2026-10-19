import { Point } from '@flatten-js/core';
import { type SnapPoint, SnapPointType } from '../App.types';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { getSplinePoints } from '../helpers/spline-points.ts';
import { getActiveLayerId } from '../state.ts';
import { CurveEntity } from './CurveEntity.ts';
import { EntityName, type JsonEntity } from './Entity';

/**
 * Smooth curve that goes through all its fit points
 */
export class SplineEntity extends CurveEntity {
	constructor(private fitPoints: Point[]) {
		super();
	}

	public getFitPoints(): Point[] {
		return this.fitPoints;
	}

	public getApproximationPoints(): Point[] {
		return getSplinePoints(this.fitPoints);
	}

	public isClosed(): boolean {
		return false;
	}

	protected transformDefinitionPoints(transform: (point: Point) => Point): void {
		this.fitPoints = this.fitPoints.map(transform);
	}

	public clone(): SplineEntity {
		return copyEntityBaseProperties(
			this,
			new SplineEntity(this.fitPoints.map((point) => point.clone()))
		);
	}

	public getSnapPoints(): SnapPoint[] {
		return this.fitPoints.map((point, index) => ({
			point,
			type:
				index === 0 || index === this.fitPoints.length - 1
					? SnapPointType.LineEndPoint
					: SnapPointType.Point,
		}));
	}

	public getType(): EntityName {
		return EntityName.Spline;
	}

	public async toJson(): Promise<JsonEntity<SplineJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Spline,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				fitPoints: this.fitPoints.map((point) => ({ x: point.x, y: point.y })),
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<SplineJsonData>): Promise<SplineEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Spline: missing shapeData');
		}
		const splineEntity = new SplineEntity(
			jsonEntity.shapeData.fitPoints.map((point) => new Point(point.x, point.y))
		);
		splineEntity.layerId = jsonEntity.layerId || getActiveLayerId();
		splineEntity.id = jsonEntity.id;
		splineEntity.lineColor = jsonEntity.lineColor;
		splineEntity.lineWidth = jsonEntity.lineWidth;
		return splineEntity;
	}
}

export interface SplineJsonData {
	fitPoints: { x: number; y: number }[];
}
