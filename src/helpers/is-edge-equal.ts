import type {Edge} from "../App.types.ts";
import {Arc, Segment} from "@flatten-js/core";
import {isPointEqual} from "./is-point-equal.ts";

export function isEdgeEqual(edge1: Edge, edge2: Edge): boolean {
  // same start and end points
  if (isPointEqual(edge1.start, edge2.start) && isPointEqual(edge1.end, edge2.end) || isPointEqual(edge1.start, edge2.end) && isPointEqual(edge1.end, edge2.start)) {
    // Both segments
    if (edge1 instanceof Segment && edge2 instanceof Segment) {
      return true;
    }
    // Both arcs
    if (edge1 instanceof Arc && edge2 instanceof Arc) {
      // arcs with same center and radius
      return isPointEqual(edge1.center, edge2.center) && edge1.r === edge2.r && edge1.counterClockwise === edge2.counterClockwise;
    }
  }
  return false;
}
