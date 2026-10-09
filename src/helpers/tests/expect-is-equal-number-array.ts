import {expect} from 'vitest';

export function expectIsEqualNumberArray(actual: number[], expected: number[]) {
	return expect(actual).toEqual(expected.map((num) => expect.closeTo(num, 13)));
}
