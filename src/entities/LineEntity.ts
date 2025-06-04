import {type Box, Point, Segment} from '@flatten-js/core'; // Vector is implicitly used via Point methods
import {sortBy, uniqWith} from 'es-toolkit';
import {type Shape, type SnapPoint, SnapPointType} from '../App.types';
import type {DrawController} from '../drawControllers/DrawController';
import {pointDistance} from '../helpers/distance-between-points';
import {getExportColor} from '../helpers/get-export-color';
import {isPointEqual} from '../helpers/is-point-equal';
import {mirrorPointOverAxis} from '../helpers/mirror-point-over-axis.ts';
import {scalePoint} from '../helpers/scale-point';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {type Entity, EntityName, type JsonEntity} from './Entity';

export class LineEntity implements Entity {
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

	public draw(drawController: DrawController, highlighted?: boolean, selected?: boolean): void {
		drawController.setLineStyles(
			highlighted ?? isEntityHighlighted(this),
			selected ?? isEntitySelected(this),
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
        if (!(shape instanceof Point)) {
            // Fallback for non-Point shapes, similar to ArcEntity's updated distanceTo.
            // For this specific issue, 'shape' is always a Point from findClosestEntity.
            try {
                if (typeof this.segment.distanceTo === 'function') {
                    const result = this.segment.distanceTo(shape);
                    if (result && Array.isArray(result) && result.length === 2 && typeof result[0] === 'number') {
                        return result as [number, Segment | null];
                    }
                }
            } catch (e) {
                // console.error("LineEntity.distanceTo fallback failed for non-Point shape:", e);
            }
            return null;
        }

        const P: Point = shape;
        const A = this.segment.start;
        const B = this.segment.end;

        const vecAB = B.subtract(A); // Vector from A to B
        const vecAP = P.subtract(A); // Vector from A to P

        // Handle degenerate segment case (A and B are the same point)
        const lenSqVecAB = vecAB.dot(vecAB); // Equivalent to vecAB.length * vecAB.length

        let closestPointOnSegment: Point;

        if (lenSqVecAB < 1e-12) { // Consider segment degenerate if length squared is very small
            closestPointOnSegment = A;
        } else {
            // Calculate projection of AP onto AB, t = (AP . AB) / |AB|^2
            const t = vecAP.dot(vecAB) / lenSqVecAB;

            if (t < 0) {
                closestPointOnSegment = A; // Closest point is A
            } else if (t > 1) {
                closestPointOnSegment = B; // Closest point is B
            } else {
                // Projection falls within the segment
                // closestPointOnSegment = A.add(vecAB.multiply(t)); // A + t * (B - A)
                // flatten-js Point.add() expects a Vector. B.subtract(A) is already a Vector.
                closestPointOnSegment = A.translate(vecAB.multiply(t)); // A.translate is A.add for Vector
            }
        }

        const distance = P.distanceTo(closestPointOnSegment)[0];
        return [distance, new Segment(P, closestPointOnSegment)];
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

	public getAngle(): number {
		const diffX = this.segment.end.x - this.segment.start.x;
		const diffY = this.segment.end.y - this.segment.start.y;
		if (diffX === 0) {
			// Vertical line
			return Math.PI / 2;
		}
		const slope = diffY / diffX;
		const angle = Math.atan(slope);
		return (angle + Math.PI) % Math.PI; // always reduce to a number between 0 and 180 degrees
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
}

export interface LineJsonData {
	startPoint: { x: number; y: number };
	endPoint: { x: number; y: number };
}
