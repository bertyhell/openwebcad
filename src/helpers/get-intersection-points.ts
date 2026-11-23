import { type Box, Point } from '@flatten-js/core';
import { uniqWith } from 'es-toolkit';
import { EPSILON } from '../App.consts';
import type { Shape } from '../App.types';
import { type Entity, EntityName } from '../entities/Entity';
import { isPointEqual } from './is-point-equal';

type IntersectionShape = Exclude<Shape, Point>;

/**
 * Shapes of the entity that other entities can cross
 * Polylines, groups, fills and open splines don't consist of a single shape, so their edges are used instead
 * Points, texts and measurements have no outline, so nothing crosses them
 */
function getIntersectionShapes(entity: Entity): IntersectionShape[] {
	if (entity.getType() === EntityName.Group) {
		// Use the shapes of the members, so a circle inside a group is intersected as a circle
		return (entity as Entity & { entities: Entity[] }).entities.flatMap(getIntersectionShapes);
	}
	const shape = entity.getShape();
	if (shape && !(shape instanceof Point)) {
		return [shape];
	}
	return entity.getEdges();
}

/**
 * Whether two boxes overlap or touch, with a small margin so rounding errors don't hide an intersection
 */
function boxesOverlap(box1: Box, box2: Box): boolean {
	return !(
		box1.xmax < box2.xmin - EPSILON ||
		box2.xmax < box1.xmin - EPSILON ||
		box1.ymax < box2.ymin - EPSILON ||
		box2.ymax < box1.ymin - EPSILON
	);
}

function getShapeIntersections(
	shapes1: IntersectionShape[],
	shapes2: IntersectionShape[]
): Point[] {
	if (!shapes1.length || !shapes2.length) {
		return [];
	}
	// Splines consist of many short segments, so skip the pairs that are too far apart to cross
	const boxes2 = shapes2.map((shape) => shape.box);
	const totalBox2 = boxes2.reduce((totalBox, box) => totalBox.merge(box));
	const points: Point[] = [];
	for (const shape1 of shapes1) {
		const box1 = shape1.box;
		if (!boxesOverlap(box1, totalBox2)) {
			continue;
		}
		shapes2.forEach((shape2, index) => {
			if (boxesOverlap(box1, boxes2[index])) {
				points.push(...shape1.intersect(shape2));
			}
		});
	}
	// Crossing a polyline where two of its segments meet would otherwise give the same point twice
	return uniqWith(points, isPointEqual);
}

/**
 * Points where the two entities cross
 * The result doesn't depend on the order of the entities, also when one of them is a polyline, group or spline
 */
export function getEntityIntersections(entity1: Entity, entity2: Entity): Point[] {
	return getShapeIntersections(getIntersectionShapes(entity1), getIntersectionShapes(entity2));
}

/**
 * Points where a polyline crosses itself
 * The points where one segment ends and the next one starts are not crossings, so they are left out
 */
export function getSelfIntersectionPoints(entity: Entity): Point[] {
	if (entity.getType() !== EntityName.PolyLine) {
		return [];
	}
	const edges = entity.getEdges();
	const points: Point[] = [];
	for (let i = 0; i < edges.length; i++) {
		for (let j = i + 1; j < edges.length; j++) {
			const endPoints = [edges[i].start, edges[i].end, edges[j].start, edges[j].end];
			points.push(
				...getShapeIntersections([edges[i]], [edges[j]]).filter(
					(point) => !endPoints.some((endPoint) => isPointEqual(point, endPoint))
				)
			);
		}
	}
	return uniqWith(points, isPointEqual);
}

/**
 * Intersections between every pair of entities in the list
 */
export function getIntersectionPoints(entities: Entity[]): Point[] {
	const intersectionPoints: Point[] = [];

	for (let i = 0; i < entities.length; i++) {
		const entity1 = entities[i];
		// getIntersections gives the same points regardless of the order of the entities, so every pair only needs to be checked once
		for (let j = i + 1; j < entities.length; j++) {
			intersectionPoints.push(...entity1.getIntersections(entities[j]));
		}
	}

	return intersectionPoints;
}

/**
 * Intersections between every entity of the first list and every entity of the second list
 */
export function getIntersectionPointsBetween(entities1: Entity[], entities2: Entity[]): Point[] {
	const intersectionPoints: Point[] = [];
	for (const entity1 of entities1) {
		for (const entity2 of entities2) {
			intersectionPoints.push(...entity1.getIntersections(entity2));
		}
	}
	return intersectionPoints;
}
