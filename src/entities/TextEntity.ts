import {Entity, EntityName, JsonEntity} from './Entity';
import {Shape, SnapPoint} from '../App.types';
import {Box, Point, Segment, Vector} from '@flatten-js/core';
import {DEFAULT_TEXT_OPTIONS, DrawController,} from '../drawControllers/DrawController';
import {cloneDeep} from 'es-toolkit/compat';
import {scalePoint} from '../helpers/scale-point.ts';
import {getActiveLayerId, isEntityHighlighted, isEntitySelected} from '../state.ts';
import {LineEntity} from "./LineEntity.ts";
import {mirrorPointOverAxis} from "../helpers/mirror-point-over-axis.ts";

export interface TextOptions {
	textDirection: Vector;
	textAlign: 'left' | 'center' | 'right';
	textColor: string;
	fontSize: number;
	fontFamily: string;
}

export class TextEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor: string = '#fff';
	public lineWidth: number = 1;
	public lineDash: number[] = [];
	public layerId: string;
	private readonly options: TextOptions;

	constructor(
		layerId: string,
		private label: string,
		private basePoint: Point,
		options?: Partial<TextOptions>,
	) {
		this.layerId = layerId,
			this.options = {
				...DEFAULT_TEXT_OPTIONS,
				...options,
			};
	}

	public draw(drawController: DrawController): void {
		drawController.setLineStyles(
			isEntityHighlighted(this),
			isEntitySelected(this),
			this.lineColor,
			this.lineWidth,
			this.lineDash,
		);
		drawController.drawText(this.label, this.basePoint, this.options);
	}

	public move(x: number, y: number) {
		this.basePoint = this.basePoint.translate(x, y);
	}

	public scale(scaleOrigin: Point, scaleFactor: number) {
		this.basePoint = scalePoint(this.basePoint, scaleOrigin, scaleFactor);
		this.options.fontSize = this.options.fontSize * scaleFactor; // TODO discuss if text should scale or not?
	}

	public rotate(rotateOrigin: Point, angle: number) {
		this.basePoint = this.basePoint.rotate(angle, rotateOrigin);
		this.options.textDirection = this.options.textDirection.rotate(angle);
	}

	public mirror(mirrorAxis: LineEntity) {
		this.basePoint = mirrorPointOverAxis(this.basePoint, mirrorAxis);
		this.options.textDirection = new Vector(new Point(0, 0), new Point(this.options.textDirection.x, this.options.textDirection.y));
	}

	public clone(): TextEntity {
		return new TextEntity(
			getActiveLayerId(),
			this.label,
			this.basePoint.clone(),
			cloneDeep(this.options),
		);
	}

	public intersectsWithBox(box: Box): boolean {
		return box.contains(this.basePoint);
	}

	public isContainedInBox(box: Box): boolean {
		return box.contains(this.basePoint);
	}

	public getBoundingBox(): Box {
		// TODO find better way of determining the text bounding box
		return new Box(this.basePoint.x, this.basePoint.y, this.basePoint.x + this.options.fontSize * this.label.length, this.basePoint.y + this.options.fontSize);
	}

	public getShape(): Shape | null {
		return null; // TODO see why we need to get the shape out of an entity
	}

	public getSnapPoints(): SnapPoint[] {
		return [];
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public getIntersections(_entity: Entity): Point[] {
		return [];
	}

	public getFirstPoint(): Point | null {
		return this.basePoint;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		return this.basePoint.distanceTo(shape);
	}

	public getSvgString(): string | null {
		return null;
	}

	public getType(): EntityName {
		return EntityName.Text;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public containsPointOnShape(_point: Point): boolean {
		return false;
	}

	public async toJson(): Promise<JsonEntity<TextJsonData> | null> {
		return {
			id: this.id,
			type: EntityName.Text,
			lineColor: this.lineColor,
			lineWidth: this.lineWidth,
			layerId: this.layerId,
			shapeData: {
				label: this.label,
				basePoint: {x: this.basePoint.x, y: this.basePoint.y},
				options: {
					textDirection: {
						x: this.options.textDirection.x,
						y: this.options.textDirection.y,
					},
					textAlign: this.options.textAlign,
					textColor: this.options.textColor,
					fontSize: this.options.fontSize,
					fontFamily: this.options.fontFamily,
				},
			},
		};
	}

	public static async fromJson(
		jsonEntity: JsonEntity<TextJsonData>,
	): Promise<TextEntity> {
		const textEntity = new TextEntity(
			jsonEntity.layerId || getActiveLayerId(),
			jsonEntity.shapeData.label,
			new Point(
				jsonEntity.shapeData.basePoint.x,
				jsonEntity.shapeData.basePoint.y,
			),
			{
				textDirection: new Vector(
					jsonEntity.shapeData.options.textDirection.x,
					jsonEntity.shapeData.options.textDirection.y,
				),
				textAlign: jsonEntity.shapeData.options.textAlign,
				textColor: jsonEntity.shapeData.options.textColor,
				fontSize: jsonEntity.shapeData.options.fontSize,
				fontFamily: jsonEntity.shapeData.options.fontFamily,
			},
		);
		textEntity.id = jsonEntity.id;
		textEntity.lineColor = jsonEntity.lineColor;
		textEntity.lineWidth = jsonEntity.lineWidth;
		return textEntity;
	}
}

export interface TextJsonData {
	label: string;
	basePoint: { x: number; y: number };
	options: {
		textDirection: { x: number; y: number };
		textAlign: 'left' | 'center' | 'right';
		textColor: string;
		fontSize: number;
		fontFamily: string;
	};
}
