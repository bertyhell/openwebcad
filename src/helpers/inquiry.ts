import type { Point } from '@flatten-js/core';
import { round } from 'es-toolkit';
import { TO_DEGREES } from '../App.consts.ts';
import type { Edge } from '../App.types.ts';
import { calculateArea } from './calculate-area.ts';
import { pointDistance } from './distance-between-points.ts';
import type { BoundaryWithHoles } from './find-loops-in-edges.types.ts';

const INQUIRY_DECIMAL_PLACES = 2;

export interface DistanceInfo {
	distance: number;
	deltaX: number;
	deltaY: number;
	/**
	 * Angle in degrees, counterclockwise from the positive x axis, between 0 and 360
	 */
	angle: number;
}

export function getDistanceInfo(startPoint: Point, endPoint: Point): DistanceInfo {
	const deltaX = endPoint.x - startPoint.x;
	const deltaY = endPoint.y - startPoint.y;
	const angle = (Math.atan2(deltaY, deltaX) * TO_DEGREES + 360) % 360;
	return { distance: pointDistance(startPoint, endPoint), deltaX, deltaY, angle };
}

export function formatDistanceInfo(info: DistanceInfo): string {
	const format = (value: number) => round(value, INQUIRY_DECIMAL_PLACES);
	return `Distance: ${format(info.distance)}, ΔX: ${format(info.deltaX)}, ΔY: ${format(info.deltaY)}, Angle: ${format(info.angle)}°`;
}

export interface AreaInfo {
	area: number;
	perimeter: number;
}

/**
 * Area and perimeter of the polygon through the points, the last point connects back to the first point
 */
export function getPolygonAreaInfo(points: Point[]): AreaInfo {
	let doubleSignedArea = 0;
	let perimeter = 0;
	points.forEach((point, index) => {
		const nextPoint = points[(index + 1) % points.length];
		doubleSignedArea += point.x * nextPoint.y - nextPoint.x * point.y;
		perimeter += pointDistance(point, nextPoint);
	});
	return { area: Math.abs(doubleSignedArea) / 2, perimeter: points.length > 1 ? perimeter : 0 };
}

function getEdgesLength(edges: Edge[]): number {
	return edges.reduce((length, edge) => length + edge.length, 0);
}

/**
 * Area inside the boundary without the holes, the perimeter is the length of the outer boundary
 */
export function getBoundaryAreaInfo(boundary: BoundaryWithHoles): AreaInfo {
	const holesArea = boundary.holes.reduce((area, hole) => area + calculateArea(hole), 0);
	return {
		area: calculateArea(boundary.boundary) - holesArea,
		perimeter: getEdgesLength(boundary.boundary),
	};
}

export function formatAreaInfo(info: AreaInfo): string {
	return `Area: ${round(info.area, INQUIRY_DECIMAL_PLACES)}, Perimeter: ${round(info.perimeter, INQUIRY_DECIMAL_PLACES)}`;
}
