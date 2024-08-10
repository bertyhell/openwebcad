import { Point } from "@flatten-js/core";
import { SnapPoint } from "../App.types";
import { Entity } from "../entities/Entitity";

export function getSnapPoints(_mouse: Point, entities: Entity[]): SnapPoint[] {
    const snapPoints: SnapPoint[] = [];

    // intra entity based snap points
    entities.forEach(entity => {
      snapPoints.push(...entity.getSnapPoints());
    })

    // inter entity based snap points
    // TODO

    return snapPoints;
  }

  export function getClosestSnapPoint(snapPoints: SnapPoint[]): Point | null {
    // TODO
    return snapPoints[0]?.point || null;
  }