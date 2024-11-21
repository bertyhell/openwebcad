import { LineEntity } from '../entities/LineEntity';
import { times } from './times';
import { Point } from '@flatten-js/core';

export function getAngleGuideLines(
  firstPoint: Point,
  angleStep: number,
): LineEntity[] {
  // Only for 180 degrees since we draw lines that are infinite in both directions,
  // so we only need to fill half a circle to fill the complete circle
  return times(180 / angleStep, i => {
    const angle = i * angleStep;
    const angleRad = angle * (Math.PI / 180);
    const x = firstPoint.x + Math.cos(angleRad);
    const y = firstPoint.y + Math.sin(angleRad);
    return new LineEntity(
      new Point(
        firstPoint.x - 10000 * (x - firstPoint.x),
        firstPoint.y - 10000 * (y - firstPoint.y),
      ),
      new Point(
        firstPoint.x + 10000 * (x - firstPoint.x),
        firstPoint.y + 10000 * (y - firstPoint.y),
      ),
    );
  });
}
