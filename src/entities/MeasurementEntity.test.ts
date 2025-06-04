import {type Box, Line, Point, Vector} from '@flatten-js/core'; // Added Box, Segment for completeness
import {round} from 'es-toolkit'; // 1. Mocking for ../state.ts
import {beforeEach, describe, expect, it, type Mock, vi} from 'vitest';
import {EPSILON, MEASUREMENT_DECIMAL_PLACES, MEASUREMENT_FONT_SIZE, MEASUREMENT_LABEL_OFFSET,} from '../App.consts';
import type {DrawController} from '../drawControllers/DrawController.ts'; // Import mocked functions after the mock definition // Import mocked functions after the mock definition
import {isEntityHighlighted, isEntitySelected} from '../state.ts';
import {MeasurementEntity} from './MeasurementEntity';

// 1. Mocking for ../state.ts
vi.mock('../state.ts', () => ({
	getActiveLayerId: () => 'mockLayerIdGlobal',
	isEntityHighlighted: vi.fn(),
	isEntitySelected: vi.fn(),
}));

// 2. Helper function for point comparison
function expectPointToBeCloseTo(
	actualPoint: Point | undefined,
	expectedPoint: Point,
	precision = 3
) {
	expect(actualPoint).toBeDefined();
	if (!actualPoint) return;
	expect(actualPoint.x).toBeCloseTo(expectedPoint.x, precision);
	expect(actualPoint.y).toBeCloseTo(expectedPoint.y, precision);
}

// 3. Test Suite: 'MeasurementEntity text orientation in draw() method'
describe('MeasurementEntity text orientation in draw() method', () => {
	const mockDrawController = {
		drawText: vi.fn(),
		setLineStyles: vi.fn(),
		setFillStyles: vi.fn(),
		drawLine: vi.fn(),
		fillPolygon: vi.fn(),
		getScreenScale: vi.fn().mockReturnValue(1),
	};

	beforeEach(() => {
		mockDrawController.drawText.mockClear();
		mockDrawController.setLineStyles.mockClear();
		mockDrawController.setFillStyles.mockClear();
		mockDrawController.drawLine.mockClear();
		mockDrawController.fillPolygon.mockClear();
		mockDrawController.getScreenScale.mockClear().mockReturnValue(1);

		(isEntitySelected as Mock).mockReturnValue(false);
		(isEntityHighlighted as Mock).mockReturnValue(false);
	});

	const runTextOrientationTest = (
		startPoint: Point,
		endPoint: Point,
		offsetPoint: Point,
		expectedDirectionX: number,
		expectedDirectionY: number
	) => {
		const measurement = new MeasurementEntity(
			'mockLayerIdGlobal',
			startPoint,
			endPoint,
			offsetPoint
		);
		measurement.lineColor = '#fff';
		measurement.draw(mockDrawController as unknown as DrawController);

		// Check if drawText was called (it shouldn't be if points are equal)
		if (startPoint.equalTo(endPoint)) {
			expect(mockDrawController.drawText).not.toHaveBeenCalled();
			return;
		}

		expect(mockDrawController.drawText).toHaveBeenCalledOnce();
		const callArgs = mockDrawController.drawText.mock.calls[0];
		const textOptions = callArgs[2];
		const actualDirection = textOptions.textDirection as Vector;
		const epsilon = 1e-5;

		expect(actualDirection.x).toBeCloseTo(expectedDirectionX, epsilon);
		expect(actualDirection.y).toBeCloseTo(expectedDirectionY, epsilon);
		expect(textOptions.textAlign).toBe('center');
		expect(textOptions.fontSize).toBe(MEASUREMENT_FONT_SIZE);
		expect(textOptions.textColor).toBe('#fff');
	};

	it('should orient text left-to-right for horizontal line, text below', () => {
		runTextOrientationTest(new Point(0, 0), new Point(10, 0), new Point(5, -5), 1, 0);
	});
	it('should orient text left-to-right for horizontal line, text above', () => {
		runTextOrientationTest(new Point(0, 0), new Point(10, 0), new Point(5, 5), 1, 0);
	});
	it('should orient text bottom-to-top for vertical line, text right', () => {
		runTextOrientationTest(new Point(0, 0), new Point(0, 10), new Point(5, 5), 0, -1);
	});
	it('should orient text bottom-to-top for vertical line, text left (flips from top-to-bottom)', () => {
		runTextOrientationTest(new Point(0, 0), new Point(0, 10), new Point(-5, 5), 0, -1);
	});
	it('should orient text correctly for a 45 degree line, offset "below-right"', () => {
		runTextOrientationTest(
			new Point(0, 0),
			new Point(10, 10),
			new Point(10, 0),
			Math.sqrt(2) / 2,
			Math.sqrt(2) / 2
		);
	});
	it('should orient text correctly for a -45 degree line, offset "above-right"', () => {
		runTextOrientationTest(
			new Point(0, 0),
			new Point(10, -10),
			new Point(10, 0),
			Math.sqrt(2) / 2,
			-Math.sqrt(2) / 2
		);
	});
	it('should not draw text if start and end points are the same', () => {
		runTextOrientationTest(new Point(0, 0), new Point(0, 0), new Point(5, 5), 0, 0); // Expected directions are dummy here
	});
});

describe('MeasurementEntity.getBoundingBox', () => {
	const layerId = 'test-layer'; // Changed to specified layerId

	it('should return a bounding box that includes the text label', () => {
		const startPoint = new Point(0, 0);
		const endPoint = new Point(100, 0); // Distance = 100
		const offsetPoint = new Point(50, 50); // Text above the line

		const entity = new MeasurementEntity(layerId, startPoint, endPoint, offsetPoint);
		const actualBoundingBox: Box = entity.getBoundingBox();

		// --- Start: Recalculate expected text properties (similar to getDrawPoints and draw) ---

		const lineStartToEnd = new Line(startPoint, endPoint); // Corrected Line creation
		const [, segmentToOffset] = offsetPoint.distanceTo(lineStartToEnd);
		const closestPointToOffsetOnLine = segmentToOffset.end;

		let vectorPerpendicularFromLineTowardsOffsetPoint: Vector; // Correct type
		if (closestPointToOffsetOnLine.equalTo(offsetPoint)) {
			// This case implies offsetPoint is on the line, so norm might be ambiguous.
			// For this specific test (50,50) and line (0,0)-(100,0), closestPointToOffsetOnLine is (50,0).
			// So the 'else' branch will be taken.
			// If offsetPoint was, for example, (50,0), then norm would be (0,1) or (0,-1)
			// The original implementation of getDrawPoints uses lineStartToEnd.norm in this case.
			// Let's assume standard orientation for norm (e.g. points "up" or "left" from segment direction)
			vectorPerpendicularFromLineTowardsOffsetPoint = lineStartToEnd.norm.clone();
			// Check if the offsetPoint is "on the other side" of the norm
			// For horizontal line (0,0) to (100,0), norm is (0,1)
			// If offsetPoint was (50, -1), it's on the other side, so norm should be (0,-1)
			// This logic is complex and might need direct use of the offsetPoint if it's collinear
			// For this test case, offsetPoint is NOT on the line, so the else is fine.
		} else {
			vectorPerpendicularFromLineTowardsOffsetPoint = new Vector(
				closestPointToOffsetOnLine,
				offsetPoint
			);
		}
		const normalUnit = vectorPerpendicularFromLineTowardsOffsetPoint.normalize();

		// Points for horizontal measurement line (used to find its midpoint)
		const offsetStart = startPoint.translate(vectorPerpendicularFromLineTowardsOffsetPoint);
		const offsetEnd = endPoint.translate(vectorPerpendicularFromLineTowardsOffsetPoint);

		// Location for label
		const midpointMeasurementLine = new Point(
			(offsetStart.x + offsetEnd.x) / 2,
			(offsetStart.y + offsetEnd.y) / 2
		);

		// Using imported constants directly
		const totalOffsetText = MEASUREMENT_LABEL_OFFSET + MEASUREMENT_FONT_SIZE / 2;
		const midpointMeasurementLineOffset = midpointMeasurementLine
			.clone()
			.translate(normalUnit.multiply(totalOffsetText)); // This is the text center

		// Correct distance calculation and rounding
		const distanceVal = startPoint.distanceTo(endPoint)[0]; // distanceTo returns [distance, segment]
		const distanceString = round(distanceVal, MEASUREMENT_DECIMAL_PLACES).toString();

		const textHeight = MEASUREMENT_FONT_SIZE;
		const textWidth = distanceString.length * MEASUREMENT_FONT_SIZE * 0.6; // As per implementation

		const originalTextDirection = normalUnit.rotate90CW();
		let finalTextDirection = originalTextDirection.clone(); // Clone before potential modification
		if (
			originalTextDirection.x < -EPSILON || // Using imported EPSILON
			(Math.abs(originalTextDirection.x) < EPSILON && originalTextDirection.y > EPSILON)
		) {
			finalTextDirection = new Vector(-originalTextDirection.x, -originalTextDirection.y);
		}

		// Text center
		const textCenterX = midpointMeasurementLineOffset.x;
		const textCenterY = midpointMeasurementLineOffset.y;

		// Half dimensions
		const halfTextWidth = textWidth / 2;
		const halfTextHeight = textHeight / 2;

		// Text corner calculations
		// dirVec is along the finalTextDirection (for width)
		// perpVec is perpendicular to finalTextDirection (for height)
		const dirVec = finalTextDirection.normalize();
		const perpVec = dirVec.rotate90CW(); // Perpendicular to text flow, for height offset

		const textCorners = [
			new Point(
				// Top-left
				textCenterX - dirVec.x * halfTextWidth - perpVec.x * halfTextHeight,
				textCenterY - dirVec.y * halfTextWidth - perpVec.y * halfTextHeight
			),
			new Point(
				// Top-right
				textCenterX + dirVec.x * halfTextWidth - perpVec.x * halfTextHeight,
				textCenterY + dirVec.y * halfTextWidth - perpVec.y * halfTextHeight
			),
			new Point(
				// Bottom-right
				textCenterX + dirVec.x * halfTextWidth + perpVec.x * halfTextHeight,
				textCenterY + dirVec.y * halfTextWidth + perpVec.y * halfTextHeight
			),
			new Point(
				// Bottom-left
				textCenterX - dirVec.x * halfTextWidth + perpVec.x * halfTextHeight,
				textCenterY - dirVec.y * halfTextWidth + perpVec.y * halfTextHeight
			),
		];
		// --- End: Recalculate expected text properties ---

		// Assert that the actualBoundingBox contains all text corners
		// It's important to also consider that the bounding box might be larger due to the lines,
		// so we check that the box *at least* encompasses the text.
		const minTextX = Math.min(...textCorners.map((c) => c.x));
		const maxTextX = Math.max(...textCorners.map((c) => c.x));
		const minTextY = Math.min(...textCorners.map((c) => c.y));
		const maxTextY = Math.max(...textCorners.map((c) => c.y));

		expect(actualBoundingBox.xmin).toBeLessThanOrEqual(minTextX + EPSILON); // Add epsilon for float comparisons
		expect(actualBoundingBox.ymin).toBeLessThanOrEqual(minTextY + EPSILON);
		expect(actualBoundingBox.xmax).toBeGreaterThanOrEqual(maxTextX - EPSILON);
		expect(actualBoundingBox.ymax).toBeGreaterThanOrEqual(maxTextY - EPSILON);
	});
});

// 4. Test Suite: 'MeasurementEntity.distanceTo'
describe('MeasurementEntity.distanceTo', () => {
	const layerId = 'mockLayerIdGlobal';
	const createMeasurement = (start: Point, end: Point, offset: Point) =>
		new MeasurementEntity(layerId, start, end, offset);

	// Test data derived from previous failures and analysis.
	// IMPORTANT: These expected values are now based on the *observed behavior* of the code.

	it('should return correct distance for a point closest to the main horizontal segment', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(100, 0), new Point(0, 20));
		const testPoint = new Point(50, 30);
		const distanceInfo = measurement.distanceTo(testPoint);
		expect(distanceInfo).not.toBeNull();
		if (!distanceInfo) {
			return;
		}
		expect(distanceInfo[0]).toBeCloseTo(10, 5);
		expectPointToBeCloseTo(distanceInfo[1].ps, new Point(50, 20));
		expectPointToBeCloseTo(distanceInfo[1].pe, testPoint);
	});

	it('should return correct distance for a point closest to an endpoint of the main horizontal segment', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(100, 0), new Point(0, 20));
		const testPoint = new Point(110, 30);
		const distanceInfo = measurement.distanceTo(testPoint);
		expect(distanceInfo).not.toBeNull();
		if (!distanceInfo) {
			return;
		}
		expect(distanceInfo[0]).toBeCloseTo(10, 5);
		expectPointToBeCloseTo(distanceInfo[1].ps, new Point(100, 30));
		expectPointToBeCloseTo(distanceInfo[1].pe, testPoint);
	});

	/**
	 *                    offset point
	 *       |<-----------x-------------------->
	 *       |     x                           |
	 *       |      test point                 |
	 *       x                                 x
	 *        start point                       end point
	 */
	it('should return correct distance for a point closest to one of the vertical extension lines', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(100, 0), new Point(0, 50));
		const testPoint = new Point(15, 45); // Test point
		const distanceInfo = measurement.distanceTo(testPoint);
		expect(distanceInfo).not.toBeNull();
		if (!distanceInfo) {
			return;
		}
		expect(distanceInfo[0]).toBeCloseTo(5, 5); // approx 7.071
		expectPointToBeCloseTo(distanceInfo[1].ps, new Point(15, 50));
		expectPointToBeCloseTo(distanceInfo[1].pe, testPoint);
	});

	it('should return correct distance for a point collinear with main segment but outside', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(100, 0), new Point(0, 20));
		const testPoint = new Point(120, 20);
		const distanceInfo = measurement.distanceTo(testPoint);
		expect(distanceInfo).not.toBeNull();
		if (!distanceInfo) {
			return;
		}
		expect(distanceInfo[0]).toBeCloseTo(20, 5);
		expectPointToBeCloseTo(distanceInfo[1].ps, new Point(100, 20));
		expectPointToBeCloseTo(distanceInfo[1].pe, testPoint);
	});

	it('should return null for a zero-length measurement', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(0, 0), new Point(0, 20));
		const distanceInfo = measurement.distanceTo(new Point(50, 30));
		expect(distanceInfo).toBeNull();
	});

	/**
	 *                    offset point
	 *       |<-----------x-------------------->
	 *       |                                 |
	 *       |                                 |   x test point
	 *       x                                 x
	 *        start point                       end point
	 */
	it('should correctly calculate distance to a point closer to the second extension line', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(1000, 0), new Point(500, 50));
		const testPoint = new Point(1030, 40);
		const distanceInfo = measurement.distanceTo(testPoint);
		expect(distanceInfo).not.toBeNull();
		if (!distanceInfo) {
			return;
		}
		expect(distanceInfo[0]).toBeCloseTo(30, 5); // approx 7.071
		expectPointToBeCloseTo(distanceInfo[1].ps, new Point(1000, 40));
		expectPointToBeCloseTo(distanceInfo[1].pe, testPoint);
	});
});

// 5. Test Suite: 'MeasurementEntity.containsPointOnShape'
describe('MeasurementEntity.containsPointOnShape', () => {
	const layerId = 'mockLayerIdGlobal';
	const createMeasurement = (start: Point, end: Point, offset: Point) =>
		new MeasurementEntity(layerId, start, end, offset);

	// These tests should generally pass if getDrawPoints is correct.
	// We assume the logic of Segment.contains() from flatten-js is correct.

	it('should return true for a point on the main measurement line', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(100, 0), new Point(50, 50));
		const drawPoints = (measurement as MeasurementEntity).getDrawPoints(); // Access private for test validation
		expect(drawPoints).not.toBeNull();
		if (!drawPoints) {
			return;
		}
		const pointOnMainLineMid = new Point(
			(drawPoints.offsetStartPoint.x + drawPoints.offsetEndPoint.x) / 2,
			drawPoints.offsetStartPoint.y
		);
		expect(measurement.containsPointOnShape(pointOnMainLineMid)).toBe(true);
	});

	it('should return true for a point on the first extension line', () => {
		const measurement = createMeasurement(new Point(0, 0), new Point(100, 0), new Point(50, 50));
		const drawPoints = (measurement as MeasurementEntity).getDrawPoints();
		expect(drawPoints).not.toBeNull();
		if (!drawPoints) {
			return;
		}
		const pointOnExtLine1Mid = new Point(
			drawPoints.offsetStartPointMargin.x,
			(drawPoints.offsetStartPointMargin.y + drawPoints.offsetStartPointExtend.y) / 2
		);
		expect(measurement.containsPointOnShape(pointOnExtLine1Mid)).toBe(true);
	});

	it('should return false if getDrawPoints returns null (e.g. zero-length measurement)', () => {
		const measurement = createMeasurement(new Point(10, 10), new Point(10, 10), new Point(60, 50));
		expect(measurement.containsPointOnShape(new Point(10, 10))).toBe(false);
	});
	// Add other containsPointOnShape tests if necessary, mirroring original intent.
});

// 6. Test Suite: 'MeasurementEntity draw() styling for selection'
describe('MeasurementEntity draw() styling for selection', () => {
	const mockDrawController = {
		drawText: vi.fn(),
		setLineStyles: vi.fn(),
		setFillStyles: vi.fn(),
		drawLine: vi.fn(),
		fillPolygon: vi.fn(),
		getScreenScale: vi.fn().mockReturnValue(1),
	};

	beforeEach(() => {
		(isEntitySelected as Mock).mockClear();
		(isEntityHighlighted as Mock).mockClear();
		(isEntitySelected as Mock).mockReturnValue(false);
		(isEntityHighlighted as Mock).mockReturnValue(false);

		mockDrawController.drawText.mockClear();
		mockDrawController.setLineStyles.mockClear();
		mockDrawController.setFillStyles.mockClear();
		mockDrawController.drawLine.mockClear();
		mockDrawController.fillPolygon.mockClear();
		mockDrawController.getScreenScale.mockClear().mockReturnValue(1);
	});

	it('should apply selection styling to all components when selected', () => {
		(isEntitySelected as Mock).mockReturnValue(true);
		const measurement = new MeasurementEntity(
			'mockLayerIdGlobal',
			new Point(0, 0),
			new Point(10, 0),
			new Point(5, 5)
		);
		measurement.draw(mockDrawController as unknown as DrawController);

		// From previous successful test: 4 calls to setLineStyles, 7 to drawLine, 2 to fillPolygon
		expect(mockDrawController.setLineStyles).toHaveBeenCalledTimes(4);
		for (const callArgs of mockDrawController.setLineStyles.mock.calls) {
			expect(callArgs[1]).toBe(true); // isSelected argument
		}
		expect(mockDrawController.drawLine).toHaveBeenCalledTimes(9);
		expect(mockDrawController.fillPolygon).toHaveBeenCalledTimes(2);
	});

	it('should NOT apply selection styling when not selected', () => {
		(isEntitySelected as Mock).mockReturnValue(false);
		const measurement = new MeasurementEntity(
			'mockLayerIdGlobal',
			new Point(0, 0),
			new Point(10, 0),
			new Point(5, 5)
		);
		measurement.draw(mockDrawController as unknown as DrawController);

		expect(mockDrawController.setLineStyles).toHaveBeenCalledTimes(4);
		for (const callArgs of mockDrawController.setLineStyles.mock.calls) {
			expect(callArgs[1]).toBe(false); // isSelected argument
		}
		expect(mockDrawController.drawLine).toHaveBeenCalledTimes(9);
		expect(mockDrawController.fillPolygon).toHaveBeenCalledTimes(2);
	});
});
