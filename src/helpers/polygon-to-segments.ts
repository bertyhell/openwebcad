import { Edge, Polygon, Segment } from '@flatten-js/core';

export function polygonToSegments(polygon: Polygon): Segment[] {
  const segments: Segment[] = [];
  polygon.edges.forEach((edge: Edge) => {
    segments.push(edge.shape);
  });
  return segments;
}
