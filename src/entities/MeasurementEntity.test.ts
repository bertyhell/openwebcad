import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Point, Vector } from '@flatten-js/core';
import { MeasurementEntity } from './MeasurementEntity';
import { MEASUREMENT_FONT_SIZE } from '../App.consts'; // For default options

// Mock dependencies from '../state.ts'
vi.mock('../state.ts', () => ({
    getActiveLayerId: () => 'mockLayerId',
    isEntityHighlighted: () => false,
    isEntitySelected: () => false,
}));

describe('MeasurementEntity text orientation in draw() method', () => {
    // Mock DrawController
    const mockDrawController = {
        drawText: vi.fn(),
        setLineStyles: vi.fn(),
        setFillStyles: vi.fn(),
        drawLine: vi.fn(),
        fillPolygon: vi.fn(),
        getScreenScale: vi.fn().mockReturnValue(1), // Used by drawArrowHead
        // Add any other methods called by MeasurementEntity.draw or its private helpers like drawArrowHead
        // For now, these cover the primary interactions.
    };

    beforeEach(() => {
        // Reset mocks before each test
        mockDrawController.drawText.mockClear();
        mockDrawController.setLineStyles.mockClear();
        mockDrawController.setFillStyles.mockClear();
        mockDrawController.drawLine.mockClear();
        mockDrawController.fillPolygon.mockClear();
        mockDrawController.getScreenScale.mockClear().mockReturnValue(1);
    });

    const runTest = (startPoint: Point, endPoint: Point, offsetPoint: Point, expectedDirectionX: number, expectedDirectionY: number) => {
        const measurement = new MeasurementEntity('mockLayerId', startPoint, endPoint, offsetPoint);
        measurement.lineColor = '#fff'; // Set a default color
        measurement.draw(mockDrawController as any);

        expect(mockDrawController.drawText).toHaveBeenCalledOnce();
        const callArgs = mockDrawController.drawText.mock.calls[0];
        const textOptions = callArgs[2]; // Third argument to drawText is the options object
        const actualDirection = textOptions.textDirection as Vector;

        // Use a small epsilon for comparing floating point vector components
        const epsilon = 1e-5;
        expect(actualDirection.x).toBeCloseTo(expectedDirectionX, epsilon);
        expect(actualDirection.y).toBeCloseTo(expectedDirectionY, epsilon);
        expect(textOptions.textAlign).toBe('center');
        expect(textOptions.fontSize).toBe(MEASUREMENT_FONT_SIZE);
        expect(textOptions.textColor).toBe('#fff');
    };

    it('should orient text left-to-right for horizontal line, text below', () => {
        // normalUnit = (0, -1) => originalTextDirection = (-1, 0) => finalTextDirection = (1, 0)
        runTest(new Point(0, 0), new Point(10, 0), new Point(5, -5), 1, 0);
    });

    it('should orient text left-to-right for horizontal line, text above', () => {
        // normalUnit = (0, 1) => originalTextDirection = (1, 0) => finalTextDirection = (1, 0)
        runTest(new Point(0, 0), new Point(10, 0), new Point(5, 5), 1, 0);
    });

    it('should orient text bottom-to-top for vertical line, text right', () => {
        // normalUnit = (1, 0) => originalTextDirection = (0, -1) => finalTextDirection = (0, -1)
        runTest(new Point(0, 0), new Point(0, 10), new Point(5, 5), 0, -1);
    });

    it('should orient text bottom-to-top for vertical line, text left (flips from top-to-bottom)', () => {
        // normalUnit = (-1, 0) => originalTextDirection = (0, 1) => finalTextDirection = (0, -1)
        runTest(new Point(0, 0), new Point(0, 10), new Point(-5, 5), 0, -1);
    });
    
    it('should orient text correctly for a 45 degree line, offset "below-right"', () => {
        // Line from (0,0) to (10,10). Offset to (10,0) (perpendicularly "downwards")
        // normalUnit is approx (0.707, -0.707)
        // originalTextDirection = normalUnit.rotate90CW() = (-0.707, -0.707) (points towards Q3)
        // Expected finalTextDirection should be (0.707, 0.707) (points towards Q1)
        runTest(new Point(0,0), new Point(10,10), new Point(10,0), Math.sqrt(2)/2, Math.sqrt(2)/2);
    });

    it('should orient text correctly for a -45 degree line, offset "above-right"', () => {
        // Line from (0,0) to (10,-10). Offset to (10,0) (perpendicularly "upwards")
        // normalUnit is approx (0.707, 0.707)
        // originalTextDirection = normalUnit.rotate90CW() = (0.707, -0.707) (points towards Q4)
        // Expected finalTextDirection should be (0.707, -0.707)
        runTest(new Point(0,0), new Point(10,-10), new Point(10,0), Math.sqrt(2)/2, -Math.sqrt(2)/2);
    });

    it('should not draw text if start and end points are the same', () => {
        const measurement = new MeasurementEntity('mockLayerId', new Point(0,0), new Point(0,0), new Point(5,5));
        measurement.draw(mockDrawController as any);
        expect(mockDrawController.drawText).not.toHaveBeenCalled();
    });
});
