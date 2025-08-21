import {type Point, Ray, Vector} from '@flatten-js/core';
import type {Edge} from '../App.types.ts';

function getRandomDirectionRayFromPoint(point: Point): Ray {
	// Generate a random angle in radians between 0 and 2π
	const angle = Math.random() * 2 * Math.PI;

	// Compute a vector normal (perpendicular) to that angle
	// The ray direction is along angle θ → its normal is at (θ + π/2)
	const normal = new Vector(Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2));

	// Create the Ray
	return new Ray(point, normal);
}

/**
 * Check if a point is inside a closed boundary composed of segments and arcs.
 */
export function isPointInsideBoundary(boundary: Edge[], point: Point): boolean {
	let hasCornerOnRay = true;
	let ray: Ray | null = null;
	while (hasCornerOnRay) {
		// Create a horizontal ray to the right of the point
		ray = getRandomDirectionRayFromPoint(point); // Long rightward segment

		// Check no corner points of the boundary are intersecting the ray
		for (const edge of boundary) {
			if (ray.intersect(edge.start).length || ray.intersect(edge.end).length) {
				hasCornerOnRay = true;
				break;
			}
		}
		hasCornerOnRay = false;
	}
	ray = ray as Ray;

	let intersections = 0;
	for (const edge of boundary) {
		const intersectionPoints = ray.intersect(edge);
		intersections += intersectionPoints.length;

		// You may optionally handle the case where the point lies exactly on an edge
		if (edge.contains(point)) {
			return true; // On the boundary
		}
	}

	return intersections % 2 === 1; // Inside if odd number of intersections
}
