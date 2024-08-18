import { Point, Vector } from '@flatten-js/core';
import { EPSILON } from '../App.consts.ts';
import { minBy, partition } from 'es-toolkit';

export function findNeighboringPointsOnLine(
  clickedPointOnLine: Point,
  pointsOnLine: Point[],
): [Point, Point] {
  if (pointsOnLine.length < 2) {
    throw new Error(
      'findNeighboringPointsOnLine function requires at least 2 points',
    );
  }
  // Find the vector of all points to the clicked point
  const vectors: Vector[] = pointsOnLine.map(
    point =>
      new Vector(
        clickedPointOnLine.x - point.x,
        clickedPointOnLine.y - point.y,
      ),
  );

  // Find the direction of all vectors
  const vectorsWithAngle: { vector: Vector; angle: number }[] = vectors.map(
    vector => ({
      vector,
      angle: vector.angleTo(vectors[0]),
    }),
  );

  const [vectorsOneWay, vectorsOtherWay] = partition(
    vectorsWithAngle,
    vectorWithAngle =>
      Math.abs(vectorWithAngle.angle - vectorWithAngle[0].angle) < EPSILON,
  );

  // Find the closest vector to the clicked point in both directions
  const closestVectorOneWay = minBy(
    vectorsOneWay,
    vectorWithAngle => vectorWithAngle.vector.length,
  );
  const closestVectorOtherWay = minBy(
    vectorsOtherWay,
    vectorWithAngle => vectorWithAngle.vector.length,
  );

  const firstPoint: Point = clickedPointOnLine.translate(
    closestVectorOneWay.vector,
  );
  const secondPoint: Point = clickedPointOnLine.translate(
    closestVectorOtherWay.vector,
  );

  return [firstPoint, secondPoint];
}
