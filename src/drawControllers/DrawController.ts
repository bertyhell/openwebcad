import {type Point, Vector} from '@flatten-js/core';
import {CANVAS_INPUT_FIELD_FONT_SIZE} from '../App.consts.ts';
import type {PolyLineEntity} from '../entities/PolyLineEntity.ts';

export interface DrawController {
	getCanvasSize(): Point;
	getScreenScale(): number;
	getScreenOffset(): Point;

	worldToTarget(worldCoordinate: Point): Point;
	worldsToTargets(worldCoordinates: Point[]): Point[];
	targetToWorld(screenCoordinate: Point): Point;
	targetsToWorlds(screenCoordinates: Point[]): Point[];

	setLineStyles(
		isHighlighted: boolean,
		isSelected: boolean,
		color: string,
		lineWidth: number,
		dash?: number[]
	): void;
	setFillStyles(fillColor: string): void;
	clear(): void;
	drawLine(startPoint: Point, endPoint: Point): void;
	drawArc(
		centerPoint: Point,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterClockwise: boolean
	): void;
	drawText(
		label: string,
		basePoint: Point,
		options: Partial<{
			textDirection?: Vector;
			textAlign: 'left' | 'center' | 'right';
			textColor: string;
			fontSize: number;
			fontFamily: string;
		}>
	): void;
	drawImage(
		imageElement: HTMLImageElement,
		xMin: number,
		yMin: number,
		width: number,
		height: number,
		angle: number
	): void;
	// Fill a polygon consisting of straight lines
	fillPolygon(...points: Point[]): void;
	// Fill a polyline consisting of straight lines and arcs
	fillPolyline(fillBorder: PolyLineEntity): void;
}

export const DEFAULT_TEXT_OPTIONS = {
	textDirection: new Vector(1, 0),
	textAlign: 'center' as const,
	textColor: '#FFF',
	fontSize: CANVAS_INPUT_FIELD_FONT_SIZE,
	fontFamily: 'sans-serif',
};
