import {Point} from '@flatten-js/core';
import {DEFAULT_TEXT_OPTIONS, type DrawController} from './DrawController';
import {SVG_MARGIN} from '../App.consts.ts';
import {toast} from 'react-toastify';
import type {TextOptions} from '../entities/TextEntity.ts';
import {triggerReactUpdate} from '../state.ts';
import {StateVariable} from '../helpers/undo-stack.ts';
import {isLengthEqual} from '../helpers/is-length-equal.ts';

export class SvgDrawController implements DrawController {
	private lineColor = '#000';
	private lineWidth = 1;
	private lineDash: number[] = [];
	private svgStrings: string[] = [];
	private fillColor = '#000';
	private screenScale = 1;
	private screenOffset = new Point(0, 0);

	constructor(
		private boundingBoxMinX: number,
		private boundingBoxMinY: number,
		private boundingBoxMaxX: number,
		private boundingBoxMaxY: number
	) {
		this.setScreenOffset(new Point(boundingBoxMinX - SVG_MARGIN, boundingBoxMinY + SVG_MARGIN));
	}

	getCanvasSize(): Point {
		return new Point(
			this.boundingBoxMaxX - this.boundingBoxMinX,
			this.boundingBoxMaxY - this.boundingBoxMinY
		);
	}

	public getScreenScale() {
		return this.screenScale;
	}

	public setScreenScale(newScreenScale: number) {
		this.screenScale = newScreenScale;
		triggerReactUpdate(StateVariable.screenZoom);
	}

	public getScreenOffset() {
		return this.screenOffset;
	}

	public setScreenOffset(newScreenOffset: Point) {
		this.screenOffset = newScreenOffset;
		triggerReactUpdate(StateVariable.screenOffset);
	}

	/**
	 * Convert coordinates from World Space --> Screen Space
	 */
	public worldToTarget(worldCoordinate: Point): Point {
		return new Point(
			(worldCoordinate.x - this.screenOffset.x) * this.screenScale,
			-1 * ((worldCoordinate.y - this.screenOffset.y) * this.screenScale - this.getCanvasSize().y)
		);
	}

	public worldsToTargets(worldCoordinates: Point[]): Point[] {
		return worldCoordinates.map(this.worldToTarget.bind(this));
	}

	/**
	 * Convert coordinates from Screen Space --> World Space
	 * (0, 0)       (1920, 0)
	 *
	 * (0, 1080)    (1920, 1080)
	 *
	 * convert to
	 *
	 * (0, 1080)    (1920, 1080)
	 *
	 * (0, 0)       (1920, 0)
	 */
	public targetToWorld(screenCoordinate: Point): Point {
		return new Point(
			screenCoordinate.x / this.screenScale + this.screenOffset.x,
			this.getCanvasSize().y - screenCoordinate.y / this.screenScale + this.screenOffset.y
		);
	}

	public targetsToWorlds(screenCoordinates: Point[]): Point[] {
		return screenCoordinates.map(this.targetToWorld.bind(this));
	}

	public clear() {
		this.svgStrings = [];
	}

	public setLineStyles(
		_isHighlighted: boolean,
		_isSelected: boolean,
		lineColor: string,
		lineWidth: number,
		lineDash: number[] = []
	) {
		if (
			lineColor.toLowerCase() === '#fff' ||
			lineColor.toLowerCase() === '#ffffff' ||
			lineColor === 'white'
		) {
			this.lineColor = '#000';
		} else if (
			lineColor.toLowerCase() === '#000' ||
			lineColor.toLowerCase() === '#000000' ||
			lineColor === 'black'
		) {
			this.lineColor = '#FFF';
		} else {
			this.lineColor = lineColor;
		}
		this.lineWidth = lineWidth;
		this.lineDash = lineDash;
	}

	public setFillStyles(fillColor: string) {
		if (
			fillColor.toLowerCase() === '#fff' ||
			fillColor.toLowerCase() === '#ffffff' ||
			fillColor === 'white'
		) {
			this.fillColor = '#000';
		} else if (
			fillColor.toLowerCase() === '#000' ||
			fillColor.toLowerCase() === '#000000' ||
			fillColor === 'black'
		) {
			this.fillColor = '#FFF';
		} else {
			this.fillColor = fillColor;
		}
	}

	public export() {
		const boundingBoxWidth = Math.ceil(
			this.boundingBoxMaxX - this.boundingBoxMinX + SVG_MARGIN * 2
		);
		const boundingBoxHeight = Math.ceil(
			this.boundingBoxMaxY - this.boundingBoxMinY + SVG_MARGIN * 2
		);

		const svgLines = [
			`<svg width="${boundingBoxWidth}" height="${boundingBoxHeight}" viewBox="0 0 ${boundingBoxWidth} ${boundingBoxHeight}" xmlns="http://www.w3.org/2000/svg">\n`,
			`    <rect x="0" y="0" width="${boundingBoxWidth}" height="${boundingBoxHeight}" fill="#FFF" />\n`,
			...this.svgStrings.map((svgString) => `\t${svgString}\n`),
			'</svg>',
		];

		return {
			svgLines,
			width: boundingBoxWidth,
			height: boundingBoxHeight,
		};
	}

	public drawLine(startPoint: Point, endPoint: Point): void {
		const [canvasStartPoint, canvasEndPoint] = this.worldsToTargets([startPoint, endPoint]);
		this.svgStrings.push(
			`<line x1="${canvasStartPoint.x}" y1="${canvasStartPoint.y}" x2="${canvasEndPoint.x}" y2="${canvasEndPoint.y}" stroke="${this.lineColor}" stroke-width="${this.lineWidth}" stroke-dasharray="${this.lineDash.join(',')}" stroke-linecap="round" />`
		);
	}

	public drawArc(
		centerPoint: Point,
		radius: number,
		startAngle: number,
		endAngle: number,
		counterClockwise: boolean
	) {
		const canvasCenterPoint = this.worldToTarget(centerPoint);
		const canvasRadius = radius * this.screenScale;

		// Calculate start and end points of the arc
		let startPoint = new Point(canvasCenterPoint.x + canvasRadius, canvasCenterPoint.y);
		startPoint = startPoint.rotate(startAngle, canvasCenterPoint);
		let endPoint = new Point(canvasCenterPoint.x + canvasRadius, canvasCenterPoint.y);
		endPoint = endPoint.rotate(endAngle, canvasCenterPoint);

		// Normalize the sweep angle to be between 0 and 2π
		let sweep = endAngle - startAngle;
		if (counterClockwise && sweep > 0) {
			sweep -= 2 * Math.PI;
		} else if (!counterClockwise && sweep < 0) {
			sweep += 2 * Math.PI;
		}

		const largeArcFlag = Math.abs(sweep) > Math.PI ? '1' : '0';
		const sweepFlag = counterClockwise ? '0' : '1'; // SVG: 0 = CCW, 1 = CW

		const attributes = `fill="none" stroke="${this.lineColor}" stroke-width="${this.lineWidth}" stroke-dasharray="${this.lineDash.join(',')}" stroke-linecap="round"`;
		let svgPath: string;
		if (isLengthEqual(sweep, 2 * Math.PI)) {
			svgPath = `<circle cx="${canvasCenterPoint.x}" cy="${canvasCenterPoint.y}" r="${canvasRadius}" ${attributes} />`;
		} else {
			svgPath = `<path d="M${startPoint.x},${startPoint.y} A${canvasRadius},${canvasRadius} 0 ${largeArcFlag},${sweepFlag} ${endPoint.x},${endPoint.y}" ${attributes} />`;
		}

		// Push the SVG path data string to the svgStrings array
		this.svgStrings.push(svgPath);
	}

	public drawText(label: string, basePoint: Point, options?: Partial<TextOptions>): void {
		const canvasBasePoint = this.worldToTarget(basePoint);

		const textOptions = {
			...DEFAULT_TEXT_OPTIONS,
			...options,
		};

		this.svgStrings.push(
			`<text x="${canvasBasePoint.x}" y="${canvasBasePoint.y}" fill="${textOptions.textColor}" font-size="${textOptions.fontSize}" font-family="${textOptions.fontFamily}">${label}</text>`
		);
	}

	public drawImage(
		imageElement: HTMLImageElement,
		xMin: number,
		yMin: number,
		width: number,
		height: number,
		angle: number
	): void {
		const canvas = document.createElement('canvas');
		canvas.width = imageElement.width;
		canvas.height = imageElement.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			toast.warn('Failed to create canvas context');
			console.warn('Failed to create canvas context');
			return;
		}

		ctx.drawImage(imageElement, 0, 0);
		const dataUri = canvas.toDataURL(); // Convert the image to Base64

		const svgWidth = width * this.getScreenScale();
		const svgHeight = height * this.getScreenScale();

		const worldCenterX = xMin + width / 2;
		const worldCenterY = yMin + height / 2;

		const targetCenter = this.worldToTarget(new Point(worldCenterX, worldCenterY));

		const svgX = targetCenter.x - svgWidth / 2;
		const svgY = targetCenter.y - svgHeight / 2;

		let transformAttribute = '';
		if (angle !== 0) {
			const svgAngleDegrees = angle * (180 / Math.PI);
			transformAttribute = `transform="rotate(${svgAngleDegrees}, ${targetCenter.x}, ${targetCenter.y})"`;
		}

		// noinspection HtmlUnknownAttribute
		this.svgStrings.push(
			`<image href="${dataUri}" x="${svgX}" y="${svgY}" width="${svgWidth}" height="${svgHeight}" ${transformAttribute} />`
		);
	}

	public fillPolygon(...points: Point[]) {
		if (points.length < 3) return; // Polygon needs at least 3 points
		const canvasPoints = this.worldsToTargets(points);

		const pointsString = canvasPoints.map((p) => `${p.x},${p.y}`).join(' ');
		this.svgStrings.push(`<polygon points="${pointsString}" fill="${this.fillColor}" />`);
	}
}
