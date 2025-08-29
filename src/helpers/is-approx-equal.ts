import {EPSILON} from '../App.consts.ts';

export function isApproxEqual(first: number, second: number) {
	return Math.abs(first - second) < EPSILON;
}
