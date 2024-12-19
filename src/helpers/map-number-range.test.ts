import { describe, expect, it } from 'vitest';
import { mapNumberRange } from './map-number-range';

describe('mapNumberRange', () => {
    it('should map a value from the source range to the target range (normal range)', () => {
        expect(mapNumberRange(5, 0, 10, 0, 100)).toBe(50);
        expect(mapNumberRange(0, 0, 10, 0, 100)).toBe(0);
        expect(mapNumberRange(10, 0, 10, 0, 100)).toBe(100);
    });

    it('should map values outside the source range', () => {
        expect(mapNumberRange(-5, 0, 10, 0, 100)).toBe(-50); // Extrapolate below source range
        expect(mapNumberRange(15, 0, 10, 0, 100)).toBe(150); // Extrapolate above source range
    });

    it('should handle inverted source ranges', () => {
        // Source range is 10 to 0, mapping 5 should be halfway
        // Target range is 100 to 0, so halfway is 50
        expect(mapNumberRange(5, 10, 0, 100, 0)).toBe(50);

        // Outside inverted range
        expect(mapNumberRange(15, 10, 0, 100, 0)).toBe(-50);
        expect(mapNumberRange(-5, 10, 0, 100, 0)).toBe(150);
    });

    it('should handle inverted target ranges', () => {
        // Normal source range, but inverted target
        expect(mapNumberRange(5, 0, 10, 100, 0)).toBe(50);
        expect(mapNumberRange(0, 0, 10, 100, 0)).toBe(100);
        expect(mapNumberRange(10, 0, 10, 100, 0)).toBe(0);
    });

    it('should handle zero-length source range', () => {
        // If the source range is a single point
        expect(mapNumberRange(5, 10, 10, 0, 100)).toBe(0); // Returns start of target range
        expect(mapNumberRange(10, 10, 10, 20, 40)).toBe(20); // Returns start of target range
    });

    it('should handle negative numbers and other ranges', () => {
        expect(mapNumberRange(-10, -20, 0, 0, 100)).toBe(50);
        // Here: num = -10, source = [-20,0], target = [0,100]
        // Mapping: (-10 - (-20)) / (0 - (-20)) = 10/20 = 0.5 -> 0 + 0.5*100 = 50
    });

    it('should handle floating point values', () => {
        expect(mapNumberRange(2.5, 0, 10, 0, 100)).toBe(25); // Fractional input
        expect(mapNumberRange(1.5, 0, 3, 0, 1)).toBeCloseTo(0.5, 6); // Precision check
    });

    it('should handle large ranges', () => {
        expect(mapNumberRange(500, 0, 1000, 0, 1_000_000)).toBe(500_000);
    });
});
