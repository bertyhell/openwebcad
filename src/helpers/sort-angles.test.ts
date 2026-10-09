import {describe, it} from "vitest";
import {sortAngles} from "./sort-angles.ts";
import {expectIsEqualNumberArray} from "./tests/expect-is-equal-number-array.ts";

describe('sortAngles()', () => {
	it('should order angles 1', () => {
		const sortedAngles = sortAngles([1.0, 5.0, 0.5, 3.0], true);
		expectIsEqualNumberArray(sortedAngles, [1.0, 3.0, 5.0, 0.5]);
	});

	it('should order angles 2', () => {
		const sortedAngles = sortAngles([1.0, 5.0, 0.5, 3.0], false);
		expectIsEqualNumberArray(sortedAngles, [1.0, 0.5, 5.0, 3.0]);
	});
});
