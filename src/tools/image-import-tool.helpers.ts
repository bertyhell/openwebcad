import { Box, Point } from '@flatten-js/core';

export function getContainRectangleInsideRectangle(
	imageWidth: number,
	imageHeight: number,
	rectangleStartPoint: Point,
	rectangleEndPoint: Point
): Box | null {
	const width = Math.abs(rectangleStartPoint.x - rectangleEndPoint.x);
	const height = Math.abs(rectangleStartPoint.y - rectangleEndPoint.y);

	if (width === 0 || height === 0) {
		return null;
	}

	const imageAspectRatio = imageWidth / imageHeight;
	const cursorRectangleAspectRatio = width / height;

	// Draw the image to contain the rectangle created by rectangleStartPoint and rectangleEndPoint
	if (imageAspectRatio < cursorRectangleAspectRatio) {
		const newWidth = Math.abs(height * imageAspectRatio);

		const drawX =
			rectangleStartPoint.x < rectangleEndPoint.x
				? rectangleStartPoint.x
				: rectangleStartPoint.x - newWidth;
		const drawY =
			rectangleStartPoint.y < rectangleEndPoint.y
				? rectangleStartPoint.y
				: rectangleStartPoint.y - height;

		return new Box(drawX, drawY, drawX + newWidth, drawY + height);
	}
	const newHeight = Math.abs(width / imageAspectRatio);

	const drawX =
		rectangleStartPoint.x < rectangleEndPoint.x
			? rectangleStartPoint.x
			: rectangleStartPoint.x - width;
	const drawY =
		rectangleStartPoint.y < rectangleEndPoint.y
			? rectangleStartPoint.y
			: rectangleStartPoint.y - newHeight;

	return new Box(drawX, drawY, drawX + width, drawY + newHeight);
}

/**
 * Opposite corner of an image with the given width that keeps the aspect ratio of the image
 * The image is placed on the side of the start point where the mouse is, so the user can choose the direction
 * @param startPoint the first corner of the image
 * @param mouseLocation decides the direction, right and up when the mouse is on the start point
 * @param width width of the image in world units
 * @param aspectRatio width divided by the height of the image
 */
export function getImageEndPointFromWidth(
	startPoint: Point,
	mouseLocation: Point,
	width: number,
	aspectRatio: number
): Point {
	const directionX = mouseLocation.x < startPoint.x ? -1 : 1;
	const directionY = mouseLocation.y < startPoint.y ? -1 : 1;
	return new Point(
		startPoint.x + directionX * width,
		startPoint.y + (directionY * width) / aspectRatio
	);
}
