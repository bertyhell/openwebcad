import { EPSILON } from '../App.consts';

export function isLengthEqual(length1: number, length2: number): boolean {
  return Math.abs(length1 - length2) < EPSILON;
}
