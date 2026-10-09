import type {Point} from '@flatten-js/core';
import {EPSILON} from '../App.consts';

export function isPointEqual(
	point1: Point | [number, number],
	point2: Point | [number, number]
): boolean {
	let p1x: number;
	let p1y: number;
	let p2x: number;
	let p2y: number;
	if (Array.isArray(point1)) {
		p1x = point1[0];
		p1y = point1[1];
	} else {
		p1x = point1.x;
		p1y = point1.y;
	}
	if (Array.isArray(point2)) {
		p2x = point2[0];
		p2y = point2[1];
	} else {
		p2x = point2.x;
		p2y = point2.y;
	}

	return Math.abs(p1x - p2x) < EPSILON && Math.abs(p1y - p2y) < EPSILON;
}
