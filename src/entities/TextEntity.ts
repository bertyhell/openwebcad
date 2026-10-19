import { Box, Point, Polygon, Segment, Vector } from '@flatten-js/core';
import { cloneDeep } from 'es-toolkit/compat';
import { type Edge, type Shape, type SnapPoint, SnapPointType } from '../App.types';
import { DEFAULT_TEXT_OPTIONS, type DrawController } from '../drawControllers/DrawController';
import { copyEntityBaseProperties } from '../helpers/copy-entity-base-properties';
import { mirrorPointOverAxis } from '../helpers/mirror-point-over-axis.ts';
import { scalePoint } from '../helpers/scale-point.ts';
import { getActiveLayerId, isEntityHighlighted, isEntitySelected } from '../state.ts';
import { type Entity, EntityName, type JsonEntity } from './Entity';
import type { LineEntity } from './LineEntity.ts';

/**
 * Average width of a character relative to the font size, used to estimate the size of a text
 */
const AVERAGE_CHARACTER_WIDTH = 0.55;

/**
 * Distance between the lines of a multi-line text relative to the font size
 */
const LINE_SPACING = 1.25;

export interface TextOptions {
	textDirection: Vector;
	textAlign: 'left' | 'center' | 'right';
	textColor: string;
	fontSize: number;
	fontFamily: string;
}

export class TextEntity implements Entity {
	public id: string = crypto.randomUUID();
	public lineColor = '#fff';
	public lineWidth = 1;
	public lineDash: number[] = [];
	public layerId: string;
	private readonly options: TextOptions;

	constructor(
		private label: string,
		private basePoint: Point,
		options?: Partial<TextOptions>
	) {
		this.layerId = getActiveLayerId();
		this.options = {
			...DEFAULT_TEXT_OPTIONS,
			...options,
		};
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
		// The text uses the line color, so it can be changed like the color of any other entity
		const lineBasePoints = this.getLineBasePoints();
		this.getLines().forEach((line, index) => {
			drawController.drawText(line, lineBasePoints[index], {
				...this.options,
				textColor: this.lineColor,
			});
		});
	}

	/**
	 * Lines of the text, the label is split on new line characters
	 */
	public getLines(): string[] {
		return this.label.split('\n');
	}

	/**
	 * Base point of every line, the next line is below the previous line relative to the text direction
	 */
	public getLineBasePoints(): Point[] {
		const lineOffset = this.options.textDirection
			.normalize()
			.rotate90CW()
			.multiply(this.options.fontSize * LINE_SPACING);
		return this.getLines().map((_, index) => this.basePoint.translate(lineOffset.multiply(index)));
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
		this.options.textDirection = new Vector(
			new Point(0, 0),
			new Point(this.options.textDirection.x, this.options.textDirection.y)
		);
	}

	public clone(): TextEntity {
		return copyEntityBaseProperties(
			this,
			new TextEntity(this.label, this.basePoint.clone(), cloneDeep(this.options))
		);
	}

	public intersectsWithBox(box: Box): boolean {
		return box.intersect(this.getBoundingBox());
	}

	public isContainedInBox(box: Box): boolean {
		return box.contains(this.getBoundingBox());
	}

	public getLabel(): string {
		return this.label;
	}

	public setLabel(label: string): void {
		this.label = label;
	}

	public getBasePoint(): Point {
		return this.basePoint;
	}

	public getFontSize(): number {
		return this.options.fontSize;
	}

	public getOptions(): TextOptions {
		return cloneDeep(this.options);
	}

	/**
	 * Approximate bounds of the text, without measuring the font
	 * The text is vertically centered on the base point, like it is drawn
	 */
	public getBoundingBox(): Box {
		const lines = this.getLines();
		const longestLineLength = Math.max(...lines.map((line) => line.length));
		const width = this.options.fontSize * AVERAGE_CHARACTER_WIDTH * longestLineLength;
		const halfHeight = this.options.fontSize / 2;
		const extraLinesHeight = (lines.length - 1) * this.options.fontSize * LINE_SPACING;
		let minX = this.basePoint.x;
		if (this.options.textAlign === 'center') {
			minX -= width / 2;
		} else if (this.options.textAlign === 'right') {
			minX -= width;
		}
		return new Box(
			minX,
			this.basePoint.y - halfHeight - extraLinesHeight,
			minX + width,
			this.basePoint.y + halfHeight
		);
	}

	public getShape(): Shape | null {
		return null; // TODO see why we need to get the shape out of an entity
	}

	public getEdges(): Edge[] {
		return [];
	}

	public getSnapPoints(): SnapPoint[] {
		return [{ point: this.basePoint, type: SnapPointType.Point }];
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public getIntersections(_entity: Entity): Point[] {
		return [];
	}

	public getFirstPoint(): Point | null {
		return this.basePoint;
	}

	public distanceTo(shape: Shape): [number, Segment] | null {
		const boundingBox = this.getBoundingBox();
		if (shape instanceof Point && boundingBox.contains(shape)) {
			return [0, new Segment(shape, shape)];
		}
		return new Polygon(boundingBox).distanceTo(shape);
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
				basePoint: { x: this.basePoint.x, y: this.basePoint.y },
				options: {
					textDirection: {
						x: this.options.textDirection.x,
						y: this.options.textDirection.y,
					},
					textAlign: this.options.textAlign,
					textColor: this.lineColor,
					fontSize: this.options.fontSize,
					fontFamily: this.options.fontFamily,
				},
			},
		};
	}

	public static async fromJson(jsonEntity: JsonEntity<TextJsonData>): Promise<TextEntity> {
		if (!jsonEntity.shapeData) {
			throw new Error('Invalid JSON entity of type Text: missing shapeData');
		}
		const textEntity = new TextEntity(
			jsonEntity.shapeData.label,
			new Point(jsonEntity.shapeData.basePoint.x, jsonEntity.shapeData.basePoint.y),
			{
				textDirection: new Vector(
					jsonEntity.shapeData.options.textDirection.x,
					jsonEntity.shapeData.options.textDirection.y
				),
				textAlign: jsonEntity.shapeData.options.textAlign,
				textColor: jsonEntity.shapeData.options.textColor,
				fontSize: jsonEntity.shapeData.options.fontSize,
				fontFamily: jsonEntity.shapeData.options.fontFamily,
			}
		);
		textEntity.layerId = jsonEntity.layerId || getActiveLayerId();
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
