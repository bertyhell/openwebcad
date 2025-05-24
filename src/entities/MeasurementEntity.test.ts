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

describe('MeasurementEntity.distanceTo', () => {
    const layerId = 'test-layer';

    // Re-define createMeasurement for this test suite
    // (Alternatively, this could be hoisted to a common scope in a real-world scenario)
    const createMeasurement = (
        start = new Point(0, 0),
        end = new Point(100, 0),
        offset = new Point(50, 50) // Offset above the line (positive y for horizontal line)
    ) => new MeasurementEntity(layerId, start, end, offset);

    it('should return correct distance for a point closest to the main horizontal segment', () => {
        // Measurement: start(0,0), end(100,0), offset(0,20) -> main segment from (0,20) to (100,20)
        const measurement = createMeasurement(new Point(0,0), new Point(100,0), new Point(0,20)); 
        const testPoint = new Point(50, 30); // 10 units "above" the main segment's Y-coordinate
        
        const distanceInfo = measurement.distanceTo(testPoint);
        expect(distanceInfo).not.toBeNull();
        expect(distanceInfo![0]).toBeCloseTo(10);
        expect(distanceInfo![1].ps.equalTo(testPoint)).toBe(true); // Segment starts at testPoint
        expect(distanceInfo![1].pe.equalTo(new Point(50, 20))).toBe(true); // Segment ends at closest point on main segment
    });

    it('should return correct distance for a point closest to an endpoint of the main horizontal segment', () => {
        // Main segment from (0,20) to (100,20)
        const measurement = createMeasurement(new Point(0,0), new Point(100,0), new Point(0,20)); 
        const testPoint = new Point(110, 30); // Diagonally off the endPoint (100,20)
                                              // dx = 10, dy = 10. Distance = sqrt(10^2 + 10^2) = sqrt(200)
        
        const distanceInfo = measurement.distanceTo(testPoint);
        expect(distanceInfo).not.toBeNull();
        expect(distanceInfo![0]).toBeCloseTo(Math.sqrt(200));
        expect(distanceInfo![1].ps.equalTo(testPoint)).toBe(true);
        expect(distanceInfo![1].pe.equalTo(new Point(100, 20))).toBe(true); // Closest to offsetEndPoint
    });

    it('should return correct distance for a point closest to one of the vertical extension lines', () => {
        // Measurement: start(0,0), end(100,0), offset(0,20)
        // Main segment: (0,20) to (100,20)
        // getDrawPoints will calculate extension lines. Let's use default MEASUREMENT_ORIGIN_MARGIN and MEASUREMENT_EXTENSION_LENGTH.
        // For simplicity, let's assume MEASUREMENT_ORIGIN_MARGIN = 2, MEASUREMENT_EXTENSION_LENGTH = 10 for calculation.
        // Actual values from App.consts are: MEASUREMENT_ORIGIN_MARGIN = 2, MEASUREMENT_EXTENSION_LENGTH = 8
        // So, first extension line for startPoint(0,0) with offset (0,20) (vectorPerpendicularFromLineTowardsOffsetPoint is (0,20))
        // offsetStartPointMargin: (0,0) + (0,1).normalize() * 2 = (0,2)
        // offsetStartPoint: (0,0) + (0,20) = (0,20)
        // offsetStartPointExtend: (0,20) + (0,1).normalize() * 8 = (0,28)
        // So, first extension line is from (0,2) to (0,28).
        // Note: The above calculation of offsetStartPointExtend is relative to offsetStartPoint, not startPoint
        // The actual calculation in getDrawPoints for offsetStartPointExtend is:
        // offsetStartPoint.clone().translate(vectorPerpendicularFromLineTowardsOffsetPointUnit.multiply(MEASUREMENT_EXTENSION_LENGTH))
        // vectorPerpendicularFromLineTowardsOffsetPointUnit for offset (0,20) is (0,1) (assuming start/end on x-axis)
        // So, offsetStartPointExtend = (0,20) + (0,1)*8 = (0,28)
        // And offsetStartPointMargin = (0,0) + (0,1)*2 = (0,2)
        
        const measurement = createMeasurement(new Point(0,0), new Point(100,0), new Point(0,20));
        // Test point closest to the first extension line (0,2) to (0,28)
        const testPoint = new Point(5, 15); // 5 units away horizontally from the extension line
        
        const distanceInfo = measurement.distanceTo(testPoint);
        expect(distanceInfo).not.toBeNull();
        expect(distanceInfo![0]).toBeCloseTo(5);
        expect(distanceInfo![1].ps.equalTo(testPoint)).toBe(true);
        expect(distanceInfo![1].pe.equalTo(new Point(0, 15))).toBe(true); // Closest point on segment (0,2)-(0,28)
    });

    it('should return correct distance for a point collinear with main segment but outside', () => {
        // Main segment from (0,20) to (100,20)
        const measurement = createMeasurement(new Point(0,0), new Point(100,0), new Point(0,20)); 
        const testPoint = new Point(120, 20); // Collinear, 20 units away from offsetEndPoint (100,20)
        
        const distanceInfo = measurement.distanceTo(testPoint);
        expect(distanceInfo).not.toBeNull();
        expect(distanceInfo![0]).toBeCloseTo(20);
        expect(distanceInfo![1].ps.equalTo(testPoint)).toBe(true);
        expect(distanceInfo![1].pe.equalTo(new Point(100, 20))).toBe(true);
    });
    
    it('should return null for a zero-length measurement', () => {
        // startPoint and endPoint are the same
        const measurement = createMeasurement(new Point(0,0), new Point(0,0), new Point(0,20)); 
        const testPoint = new Point(50, 30);
        const distanceInfo = measurement.distanceTo(testPoint);
        expect(distanceInfo).toBeNull();
    });

    it('should correctly calculate distance to a point closer to the second extension line', () => {
        // Measurement: start(0,0), end(100,0), offset(0,20)
        // Second extension line for endPoint(100,0) with offset (0,20)
        // offsetEndPointMargin: (100,0) + (0,1)*2 = (100,2)
        // offsetEndPointExtend: (100,20) + (0,1)*8 = (100,28)
        // Second extension line is from (100,2) to (100,28)
        const measurement = createMeasurement(new Point(0,0), new Point(100,0), new Point(0,20));
        const testPoint = new Point(95, 15); // 5 units away horizontally from the second extension line
        
        const distanceInfo = measurement.distanceTo(testPoint);
        expect(distanceInfo).not.toBeNull();
        expect(distanceInfo![0]).toBeCloseTo(5);
        expect(distanceInfo![1].ps.equalTo(testPoint)).toBe(true);
        expect(distanceInfo![1].pe.equalTo(new Point(100, 15))).toBe(true); // Closest point on segment (100,2)-(100,28)
    });
});

describe('MeasurementEntity.containsPointOnShape', () => {
    const layerId = 'test-layer';

    const createMeasurement = (
        start = new Point(0, 0),
        end = new Point(100, 0),
        offset = new Point(50, 50) // Offset above the line (positive y)
    ) => new MeasurementEntity(layerId, start, end, offset);

    it('should return true for a point on the main measurement line', () => {
        const measurement = createMeasurement();
        const drawPoints = (measurement as any).getDrawPoints();
        
        const pointOnMainLineMid = new Point(
            (drawPoints.offsetStartPoint.x + drawPoints.offsetEndPoint.x) / 2,
            drawPoints.offsetStartPoint.y 
        );
        expect(measurement.containsPointOnShape(pointOnMainLineMid)).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetStartPoint.clone())).toBe(true); // Use clone for safety
        expect(measurement.containsPointOnShape(drawPoints.offsetEndPoint.clone())).toBe(true);
    });

    it('should return true for a point on the first extension line', () => {
        const measurement = createMeasurement();
        const drawPoints = (measurement as any).getDrawPoints();

        const pointOnExtLine1Mid = new Point(
            drawPoints.offsetStartPointMargin.x,
            (drawPoints.offsetStartPointMargin.y + drawPoints.offsetStartPointExtend.y) / 2
        );
        expect(measurement.containsPointOnShape(pointOnExtLine1Mid)).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetStartPointMargin.clone())).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetStartPointExtend.clone())).toBe(true);
    });

    it('should return true for a point on the second extension line', () => {
        const measurement = createMeasurement();
        const drawPoints = (measurement as any).getDrawPoints();

        const pointOnExtLine2Mid = new Point(
            drawPoints.offsetEndPointMargin.x,
            (drawPoints.offsetEndPointMargin.y + drawPoints.offsetEndPointExtend.y) / 2
        );
        expect(measurement.containsPointOnShape(pointOnExtLine2Mid)).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetEndPointMargin.clone())).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetEndPointExtend.clone())).toBe(true);
    });

    it('should return false for a point not on any line', () => {
        const measurement = createMeasurement();
        const testPoint = new Point(500, 500); // Clearly off lines
        expect(measurement.containsPointOnShape(testPoint)).toBe(false);
    });

    it('should return false for a point very close to a line but not on it', () => {
        const measurement = createMeasurement();
        const drawPoints = (measurement as any).getDrawPoints();
        // Point 0.1 units above the middle of the main line
        const pointNearMainLine = new Point(
            (drawPoints.offsetStartPoint.x + drawPoints.offsetEndPoint.x) / 2,
            drawPoints.offsetStartPoint.y + 0.1 
        );
        expect(measurement.containsPointOnShape(pointNearMainLine)).toBe(false);

        // Point 0.1 units to the side of the first extension line
        const pointNearExtLine1 = new Point(
            drawPoints.offsetStartPointMargin.x + 0.1,
            (drawPoints.offsetStartPointMargin.y + drawPoints.offsetStartPointExtend.y) / 2
        );
        expect(measurement.containsPointOnShape(pointNearExtLine1)).toBe(false);
    });
    
    it('should return false if getDrawPoints returns null (e.g. zero-length measurement)', () => {
        const startPoint = new Point(10, 10);
        const offsetPoint = new Point(60, 50);
        // EndPoint is the same as startPoint
        const measurement = new MeasurementEntity(layerId, startPoint, startPoint.clone(), offsetPoint); 
        const testPoint = new Point(10,10); // Test with the start point itself
        expect(measurement.containsPointOnShape(testPoint)).toBe(false);

        const anotherTestPoint = new Point(50,50); // Test with an arbitrary point
        expect(measurement.containsPointOnShape(anotherTestPoint)).toBe(false);
    });

    it('should correctly identify points on a measurement with negative offset (text below)', () => {
        const measurement = createMeasurement(
            new Point(0, 100), // Start
            new Point(100, 100), // End
            new Point(50, 50) // Offset below the line (y is smaller)
        );
        const drawPoints = (measurement as any).getDrawPoints();
        
        const pointOnMainLineMid = new Point(
            (drawPoints.offsetStartPoint.x + drawPoints.offsetEndPoint.x) / 2,
            drawPoints.offsetStartPoint.y 
        );
        expect(measurement.containsPointOnShape(pointOnMainLineMid)).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetStartPoint.clone())).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetEndPoint.clone())).toBe(true);

        const pointOnExtLine1Mid = new Point(
            drawPoints.offsetStartPointMargin.x,
            (drawPoints.offsetStartPointMargin.y + drawPoints.offsetStartPointExtend.y) / 2
        );
        expect(measurement.containsPointOnShape(pointOnExtLine1Mid)).toBe(true);
    });

    it('should correctly identify points on a vertical measurement', () => {
        const measurement = createMeasurement(
            new Point(50, 0), // Start
            new Point(50, 100), // End
            new Point(100, 50) // Offset to the right
        );
        const drawPoints = (measurement as any).getDrawPoints();
        
        const pointOnMainLineMid = new Point(
            drawPoints.offsetStartPoint.x,
            (drawPoints.offsetStartPoint.y + drawPoints.offsetEndPoint.y) / 2
        );
        expect(measurement.containsPointOnShape(pointOnMainLineMid)).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetStartPoint.clone())).toBe(true);
        expect(measurement.containsPointOnShape(drawPoints.offsetEndPoint.clone())).toBe(true);

        const pointOnExtLine2Mid = new Point(
            (drawPoints.offsetEndPointMargin.x + drawPoints.offsetEndPointExtend.x) / 2,
            drawPoints.offsetEndPointMargin.y
        );
        expect(measurement.containsPointOnShape(pointOnExtLine2Mid)).toBe(true);
    });
});
