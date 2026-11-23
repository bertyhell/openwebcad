import { Point, Polygon } from '@flatten-js/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DrawController } from '../drawControllers/DrawController.ts';
import { ScreenCanvasDrawController } from '../drawControllers/screenCanvas.drawController.ts';
import { SvgDrawController } from '../drawControllers/svg.drawController.ts';
import { entityFromJson } from '../helpers/import-export-handlers/json.import.ts';
import type { JsonEntity } from './Entity.ts';
import { ImageEntity } from './ImageEntity.ts';
import { LineEntity } from './LineEntity.ts';

const imageElement = { src: 'data:image/png;base64,', width: 100, height: 50 } as HTMLImageElement;

interface DrawImageCall {
	xMin: number;
	yMin: number;
	width: number;
	height: number;
	angle: number;
	mirrored: boolean;
}

function getDrawImageCall(image: ImageEntity): DrawImageCall {
	let drawImageCall: DrawImageCall | null = null;
	const drawController = {
		setLineStyles: () => {},
		drawLine: () => {},
		drawImage: (
			_imageElement: HTMLImageElement,
			xMin: number,
			yMin: number,
			width: number,
			height: number,
			angle: number,
			mirrored = false
		) => {
			drawImageCall = { xMin, yMin, width, height, angle, mirrored };
		},
	} as unknown as DrawController;
	image.draw(drawController, false, false);
	if (!drawImageCall) {
		throw new Error('drawImage was not called');
	}
	return drawImageCall;
}

/**
 * Where a corner of the image pixels ends up in the world, following the drawImage contract:
 * the unrotated image is flipped upside down when mirrored, then turned counterclockwise by the angle around its center
 * @param horizontal -1 for the left side of the image, 1 for the right side
 * @param vertical -1 for the bottom of the image, 1 for the top
 */
function getImageCorner(
	image: ImageEntity,
	horizontal: number,
	vertical: number
): [number, number] {
	const { xMin, yMin, width, height, angle, mirrored } = getDrawImageCall(image);
	const localX = (horizontal * width) / 2;
	const localY = ((mirrored ? -vertical : vertical) * height) / 2;
	const x = xMin + width / 2 + localX * Math.cos(angle) - localY * Math.sin(angle);
	const y = yMin + height / 2 + localX * Math.sin(angle) + localY * Math.cos(angle);
	return [Math.round(x * 1000) / 1000 + 0, Math.round(y * 1000) / 1000 + 0];
}

function getCorners(image: ImageEntity) {
	return {
		bottomLeft: getImageCorner(image, -1, -1),
		bottomRight: getImageCorner(image, 1, -1),
		topLeft: getImageCorner(image, -1, 1),
	};
}

function createImage(): ImageEntity {
	return new ImageEntity(imageElement, new Point(0, 0), new Point(100, 50));
}

const verticalAxis = new LineEntity(new Point(0, -10), new Point(0, 10));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ImageEntity', () => {
	it('draws an image that is not rotated over its outline', () => {
		expect(getCorners(createImage())).toEqual({
			bottomLeft: [0, 0],
			bottomRight: [100, 0],
			topLeft: [0, 50],
		});
	});

	it('draws an image that is created from an outline without an angle, like the image import tool does', () => {
		const image = new ImageEntity(
			imageElement,
			new Polygon([new Point(0, 0), new Point(0, 50), new Point(100, 50), new Point(100, 0)])
		);
		expect(getCorners(image)).toEqual(getCorners(createImage()));
		image.rotate(new Point(0, 0), Math.PI / 2);
		const { width, height, angle } = getDrawImageCall(image);
		expect([width, height, angle].every(Number.isFinite)).toBe(true);
	});

	it('draws a rotated image at its own size, turned the same way as its outline', () => {
		const image = createImage();
		image.rotate(new Point(0, 0), Math.PI / 2);
		const { width, height } = getDrawImageCall(image);
		expect(width).toBeCloseTo(100);
		expect(height).toBeCloseTo(50);
		expect(getCorners(image)).toEqual({
			bottomLeft: [0, 0],
			bottomRight: [0, 100],
			topLeft: [-50, 0],
		});
	});

	it('mirrors the pixels of the image', () => {
		const image = createImage();
		image.mirror(verticalAxis);
		expect(getDrawImageCall(image).mirrored).toBe(true);
		expect(getCorners(image)).toEqual({
			bottomLeft: [0, 0],
			bottomRight: [-100, 0],
			topLeft: [0, 50],
		});
	});

	it('mirrors a rotated image', () => {
		const image = createImage();
		image.rotate(new Point(0, 0), Math.PI / 2);
		image.mirror(verticalAxis);
		expect(getCorners(image)).toEqual({
			bottomLeft: [0, 0],
			bottomRight: [0, 100],
			topLeft: [50, 0],
		});
	});

	it('is back to normal after mirroring it twice', () => {
		const image = createImage();
		image.mirror(verticalAxis);
		image.mirror(verticalAxis);
		expect(getDrawImageCall(image).mirrored).toBe(false);
		expect(getCorners(image)).toEqual(getCorners(createImage()));
	});

	it('keeps the rotation and mirroring when cloned, saved and loaded', async () => {
		vi.stubGlobal('Image', class {});
		const image = createImage();
		image.rotate(new Point(0, 0), Math.PI / 2);
		image.mirror(verticalAxis);
		const json = JSON.parse(JSON.stringify(await image.clone().toJson())) as JsonEntity;
		const loadedImage = (await entityFromJson(json)) as ImageEntity;
		expect(getCorners(loadedImage)).toEqual(getCorners(image));
		expect(getDrawImageCall(loadedImage).mirrored).toBe(true);
	});
});

describe('drawing images', () => {
	it('turns the image counterclockwise on the screen canvas, where the y axis points down', () => {
		const calls: [string, ...unknown[]][] = [];
		const context = new Proxy(
			{},
			{
				get:
					(_target, name: string) =>
					(...args: unknown[]) => {
						calls.push([name, ...args]);
					},
			}
		) as unknown as CanvasRenderingContext2D;
		const drawController = new ScreenCanvasDrawController(context);
		drawController.drawImage(imageElement, 0, 0, 100, 50, Math.PI / 2, true);

		expect(calls.find(([name]) => name === 'rotate')).toEqual(['rotate', -Math.PI / 2]);
		expect(calls.find(([name]) => name === 'scale')).toEqual(['scale', 1, -1]);
		expect(calls.find(([name]) => name === 'drawImage')).toEqual([
			'drawImage',
			imageElement,
			-50,
			-25,
			100,
			50,
		]);
	});

	it('turns the image counterclockwise in svg exports, where the y axis points down', () => {
		vi.stubGlobal('document', {
			createElement: () => ({
				getContext: () => ({ drawImage: () => {} }),
				toDataURL: () => 'data:image/png;base64,',
			}),
		});
		const drawController = new SvgDrawController(0, 0, 1000, 1000);
		drawController.drawImage(imageElement, 0, 0, 100, 50, Math.PI / 2, true);
		const imageTag = drawController
			.export()
			.svgLines.find((line) => line.includes('<image')) as string;
		expect(imageTag).toContain('width="100"');
		expect(imageTag).toContain('height="50"');
		expect(imageTag).toMatch(/rotate\(-90,/);
		expect(imageTag).toContain('scale(1 -1)');
	});
});
