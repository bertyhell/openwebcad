import { describe, expect, it } from 'vitest';
import { containRectangle } from './contain-rect.ts';

describe('containRectangle', () => {
    it('scales down a larger rectangle to fit into a smaller wrapper', () => {
        const result = containRectangle(
            0,
            0,
            200,
            200, // contained: a 200x200 square
            0,
            0,
            100,
            100, // wrapper: a 100x100 square
        );
        // Expected: scale down by factor of 0.5 to fit, centered at (25,25) to (125,125) if it was not restricted,
        // but since wrapper is only 100x100, final should be (0,0) + 100x100, scaled rect is 100x100.
        expect(result).toEqual({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    });

    it('scales up a smaller rectangle to fit inside a larger wrapper without exceeding boundaries', () => {
        const result = containRectangle(
            0,
            0,
            50,
            50, // contained: 50x50
            0,
            0,
            200,
            200, // wrapper: 200x200
        );
        // Expected: scale up by factor of 4 to fill as much space as possible while containing
        // But scaling up a 50x50 by factor 4 gives 200x200 exactly, centered at (0,0).
        expect(result).toEqual({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    });

    it('maintains aspect ratio when wrapper is rectangular and contained is square', () => {
        const result = containRectangle(
            0,
            0,
            50,
            50, // contained: 50x50 square
            0,
            0,
            200,
            100, // wrapper: 200x100
        );
        // Scale to fit inside 200x100. The width scale = 200/50=4, height scale=100/50=2.
        // Min scale = 2, so final size = 100x100.
        // Center horizontally: (200 - 100)/2 = 50 offset, vertically: (100 - 100)/2=0 offset.
        // Result = (50,0) to (150,100)
        expect(result.minX).toBeCloseTo(50);
        expect(result.minY).toBeCloseTo(0);
        expect(result.maxX).toBeCloseTo(150);
        expect(result.maxY).toBeCloseTo(100);
    });

    it('maintains aspect ratio when wrapper is rectangular and contained is also rectangular', () => {
        const result = containRectangle(
            0,
            0,
            200,
            50, // contained: 200x50
            0,
            0,
            300,
            100, // wrapper: 300x100
        );
        // Contained AR = 200/50 = 4:1
        // Wrapper AR = 300/100 = 3:1
        // To fit inside 300x100:
        // Scale factors: width scale = 300/200=1.5, height scale=100/50=2.
        // min scale = 1.5
        // Final size: 200*1.5=300 width, 50*1.5=75 height
        // Center vertically: (100 - 75)/2=12.5 offset, horizontally just fits width fully
        expect(result).toEqual({ minX: 0, minY: 12.5, maxX: 300, maxY: 87.5 });
    });

    it('handles zero-width/height contained rectangle gracefully', () => {
        // Contained rectangle is essentially a line or point
        const result = containRectangle(
            10,
            10,
            10,
            10, // contained has 0 width/height
            0,
            0,
            200,
            200, // wrapper
        );
        // Center as a single point at (100,100)
        expect(result).toEqual({ minX: 100, minY: 100, maxX: 100, maxY: 100 });
    });

    it('does not scale if contained rectangle already fits', () => {
        const result = containRectangle(
            0,
            0,
            100,
            100, // contained fits easily
            0,
            0,
            300,
            300, // wrapper
        );
        // Scale factor: width scale = 300/100=3, height scale=300/100=3, min=3, so max scale is 3.
        // But we want to "contain" fully, ideally it should scale up to take as much space as possible without exceeding,
        // So final size is 300x300, centered at (0,0).
        expect(result).toEqual({ minX: 0, minY: 0, maxX: 300, maxY: 300 });
    });

    it('correctly centers when wrapper and contained have different origins', () => {
        const result = containRectangle(
            5,
            5,
            15,
            35, // contained: 10 wide x 30 tall
            10,
            20,
            110,
            220, // wrapper: 100x200
        );
        // Wrapper size: 100x200
        // Contained size: 10x30
        // Scale factors: width scale = 100/10=10, height scale=200/30 ≈ 6.666...
        // min scale = 6.666...
        // Final size: width = 10 * 6.666... ≈ 66.666..., height = 30 * 6.666... ≈ 200
        // After scaling, top-left corner should be placed so it centers:
        // Horizontal center: (100 - 66.666...)/2 = 16.666... offset from wrapperMinX=10 => minX≈26.666...
        // Vertical center: fits height exactly, so minY=20, maxY=20+200=220
        expect(result.minX).toBeCloseTo(26.6667);
        expect(result.minY).toBeCloseTo(20);
        expect(result.maxX).toBeCloseTo(93.3333);
        expect(result.maxY).toBeCloseTo(220);
    });

    it('handles negative coordinates in wrapper and contained rectangles', () => {
        const result = containRectangle(
            -50,
            -25,
            50,
            25, // contained: 100 wide x 50 tall
            -100,
            -50,
            100,
            50, // wrapper: 200 wide x 100 tall
        );
        // Scale factors: width scale = 200/100=2, height scale=100/50=2
        // min scale = 2, final size: 200x100 exactly.
        // Centering: wrapper ranges from -100 to 100 (x) and -50 to 50 (y)
        // After scaling contained to 200x100, it fits exactly. minX = -100, maxX=100, minY=-50, maxY=50
        expect(result).toEqual({ minX: -100, minY: -50, maxX: 100, maxY: 50 });
    });

    it('handles negative coordinates in contained rectangles', () => {
        const result = containRectangle(
            -50,
            -25,
            50,
            25, // contained: 100 wide x 50 tall
            0,
            0,
            100,
            100, // wrapper: 100 wide x 100 tall
        );
        expect(result).toEqual({ minX: 0, minY: 25, maxX: 100, maxY: 75 });
    });
});
