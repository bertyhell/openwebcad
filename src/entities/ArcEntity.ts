import {type Entity, EntityName, type JsonEntity} from './Entity';
import {type Shape, type SnapPoint, SnapPointType} from '../App.types';
import {Arc, type Box, Line, Point, type Segment} from '@flatten-js/core';
import {uniqWith} from 'es-toolkit';
import {isPointEqual} from '../helpers/is-point-equal';
import {sortPointsOnArc} from '../helpers/sort-points-on-arc';
import {getExportColor} from '../helpers/get-export-color';
import {scalePoint} from '../helpers/scale-point';
import type {DrawController} from '../drawControllers/DrawController.ts';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import type {LineEntity} from "./LineEntity.ts";
import {mirrorPointOverAxis} from "../helpers/mirror-point-over-axis.ts";

export class ArcEntity implements Entity {
    public id: string = crypto.randomUUID();
    public lineColor = '#fff';
    public lineWidth = 1;
    public lineDash: number[] | undefined = undefined;
    public layerId: string;

    private arc: Arc;

    public static getAngle(centerPoint: Point, pointOnArc: Point): number {
        return new Line(centerPoint, pointOnArc).slope;
    }

    constructor(
        layerId: string,
        centerPoint: Point,
        radius: number,
        startAngle: number,
        endAngle: number,
        counterClockwise = true,
    ) {
        this.layerId = layerId;
        this.arc = new Arc(
            centerPoint,
            radius,
            startAngle,
            endAngle,
            counterClockwise,
        );
    }

    public draw(drawController: DrawController): void {
        drawController.setLineStyles(
            isEntityHighlighted(this),
            isEntitySelected(this),
            this.lineColor,
            this.lineWidth,
            this.lineDash,
        );
        drawController.drawArc(
            this.arc.center,
            this.arc.r.valueOf(),
            this.arc?.startAngle || 0,
            this.arc?.endAngle || 2 * Math.PI,
            this.arc.counterClockwise,
        );
    }

    public move(x: number, y: number) {
        this.arc = this.arc.translate(x, y);
    }

    public scale(scaleOrigin: Point, scaleFactor: number) {
        const center = scalePoint(this.arc.center, scaleOrigin, scaleFactor);
        this.arc = new Arc(
            center,
            this.arc.r.valueOf() * scaleFactor,
            this.arc.startAngle,
            this.arc.endAngle,
            this.arc.counterClockwise,
        );
    }

    public rotate(rotateOrigin: Point, angle: number) {
        this.arc = this.arc.rotate(angle, rotateOrigin);
    }

    public mirror(mirrorAxis: LineEntity) {
        const mirroredCenter = mirrorPointOverAxis(this.arc.center, mirrorAxis);
        mirrorAxis.getAngle();
        this.arc = new Arc(
            mirroredCenter,
            this.arc.r.valueOf(),
            -this.arc.startAngle,
            -this.arc.endAngle,
            !this.arc.counterClockwise
        )
    }

    public clone(): Entity {
        if (this.arc) {
            const { center, r, startAngle, endAngle, counterClockwise } =
                this.arc;
            return new ArcEntity(
                getActiveLayerId(),
                center,
                r.valueOf(),
                startAngle,
                endAngle,
                counterClockwise,
            );
        }
        return this;
    }

    public intersectsWithBox(box: Box): boolean {
        return this.arc.intersect(box).length > 0;
    }

    public isContainedInBox(box: Box): boolean {
        return box.contains(this.arc);
    }

    public getBoundingBox(): Box {
        return this.arc.box;
    }

    public getShape(): Shape | null {
        return this.arc;
    }

    public getSnapPoints(): SnapPoint[] {
        return [
            {
                point: this.arc.center,
                type: SnapPointType.CircleCenter,
            },
            {
                point: this.arc.start,
                type: SnapPointType.LineEndPoint,
            },
            {
                point: this.arc.end,
                type: SnapPointType.LineEndPoint,
            },
            // TODO add cardinal points if they lay on the arc
            // TODO add tangent points from mouse location to circle
        ];
    }

    public getIntersections(entity: Entity): Point[] {
        const otherShape = entity.getShape();
        if (!otherShape) {
            return [];
        }
        return this.arc.intersect(otherShape);
    }

    public getFirstPoint(): Point | null {
        return this.arc.center;
    }

    public distanceTo(shape: Shape): [number, Segment] | null {
        return this.arc.distanceTo(shape);
    }

    public getSvgString(): string | null {
        return (
            this.arc.svg({
                strokeWidth: this.lineWidth,
                stroke: getExportColor(this.lineColor),
            }) || null
        );
    }

    public getType(): EntityName {
        return EntityName.Arc;
    }

    public containsPointOnShape(point: Point): boolean {
        if (!this.arc) {
            return false;
        }
        return this.arc.contains(point);
    }

    public cutAtPoints(pointsOnShape: Point[]): ArcEntity[] {
        const points = uniqWith(
            [this.arc.start, this.arc.end, ...pointsOnShape],
            isPointEqual,
        );

        const sortedPoints = sortPointsOnArc(
            points,
            this.arc.center,
            this.arc.start,
        );

        const segmentArcs: ArcEntity[] = [];
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const point1 = sortedPoints[i];
            const point2 = sortedPoints[i + 1];

            const startAngle = ArcEntity.getAngle(this.arc.center, point1);
            const endAngle = ArcEntity.getAngle(this.arc.center, point2);

            const newArc = new ArcEntity(
                getActiveLayerId(),
                this.arc.center,
                Number(this.arc.r),
                startAngle,
                endAngle,
                this.arc.counterClockwise,
            );
            newArc.lineColor = this.lineColor;
            newArc.lineWidth = this.lineWidth;
            segmentArcs.push(newArc);
        }
        return segmentArcs;
    }

    public async toJson(): Promise<JsonEntity<ArcJsonData> | null> {
        if (!this.arc) {
            return null;
        }
        return {
            id: this.id,
            type: EntityName.Arc,
            lineColor: this.lineColor,
            lineWidth: this.lineWidth,
            layerId: this.layerId,
            shapeData: {
                center: { x: this.arc.center.x, y: this.arc.center.y },
                radius: this.arc.r.valueOf(),
                startAngle: this.arc.startAngle,
                endAngle: this.arc.endAngle,
                counterClockwise: this.arc.counterClockwise,
            },
        };
    }

    public static async fromJson(
        jsonEntity: JsonEntity<ArcJsonData>,
    ): Promise<ArcEntity> {
        if (jsonEntity.type !== EntityName.Arc) {
            throw new Error('Invalid Entity type in JSON');
        }

        if (!jsonEntity.shapeData) {
            throw new Error('Invalid JSON entity of type Arc: missing shapeData');
        }

        const center = new Point(
            jsonEntity.shapeData.center.x,
            jsonEntity.shapeData.center.y,
        );
        const radius =jsonEntity.shapeData.radius;
        const startAngle = jsonEntity.shapeData.startAngle;
        const endAngle = jsonEntity.shapeData.endAngle;
        const counterClockwise = jsonEntity.shapeData.counterClockwise;

        const arcEntity = new ArcEntity(
            jsonEntity.layerId || getActiveLayerId(),
            center,
            radius,
            startAngle,
            endAngle,
            counterClockwise,
        );
        arcEntity.id = jsonEntity.id;
        arcEntity.lineColor = jsonEntity.lineColor;
        arcEntity.lineWidth = jsonEntity.lineWidth;
        return arcEntity;
    }
}

export interface ArcJsonData {
    center: { x: number; y: number };
    radius: number;
    startAngle: number;
    endAngle: number;
    counterClockwise: boolean;
}
