import { Box, Point } from '@flatten-js/core';

export function getContainRectangleInsideRectangle(
  imageWidth: number,
  imageHeight: number,
  rectangleStartPoint: Point,
  rectangleEndPoint: Point,
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
  } else {
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
}
