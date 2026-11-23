import { type Arc, Point, type Segment } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TO_DEGREES, TO_RADIANS } from '../App.consts.ts';
import { ArcEntity } from '../entities/ArcEntity.ts';
import { CircleEntity } from '../entities/CircleEntity.ts';
import { type Entity, EntityName } from '../entities/Entity.ts';
import { GroupEntity } from '../entities/GroupEntity.ts';
import { LineEntity } from '../entities/LineEntity.ts';
import { PolyLineEntity } from '../entities/PolyLineEntity.ts';
import { RectangleEntity } from '../entities/RectangleEntity.ts';
import { SplineEntity } from '../entities/SplineEntity.ts';
import { getEntities, setActiveLayerId } from '../state.ts';
import { createTestLayer, resetState } from '../test-helpers/reset-state.ts';
import { getTrimResult, handleMouseClick } from './trim-tool.ts';

const ACTIVE_LAYER = createTestLayer('active-layer');
const OTHER_LAYER = createTestLayer('other-layer');

function pointOnCircle(radius: number, degrees: number): Point {
	return new Point(
		radius * Math.cos(degrees * TO_RADIANS),
		radius * Math.sin(degrees * TO_RADIANS)
	);
}

function line(x1: number, y1: number, x2: number, y2: number): LineEntity {
	return new LineEntity(new Point(x1, y1), new Point(x2, y2));
}

function polyLine(...points: [number, number][]): PolyLineEntity {
	const lines: LineEntity[] = [];
	for (let i = 0; i < points.length - 1; i++) {
		lines.push(line(...points[i], ...points[i + 1]));
	}
	return new PolyLineEntity(lines);
}

function setDrawing(entities: Entity[]) {
	resetState([ACTIVE_LAYER, OTHER_LAYER], entities);
}

function getArcs(): Arc[] {
	return getEntities()
		.filter((entity) => entity.getType() === EntityName.Arc)
		.map((entity) => entity.getShape() as Arc);
}

/**
 * Start and end angle in degrees between 0 and 360, rounded to avoid floating point noise
 */
function arcAngles(arc: Arc): [number, number, number] {
	const toDegrees = (angle: number) => Math.round(((angle * TO_DEGREES) % 360) + 360) % 360;
	return [toDegrees(arc.startAngle), toDegrees(arc.endAngle), Math.round(arc.sweep * TO_DEGREES)];
}

function pathPoints(entity: Entity): [number, number][] {
	const edges = entity.getEdges();
	return [edges[0].start, ...edges.map((edge) => edge.end)].map((point) => [
		Math.round(point.x * 1000) / 1000,
		Math.round(point.y * 1000) / 1000,
	]);
}

beforeEach(() => {
	setActiveLayerId(ACTIVE_LAYER.id);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('trim with polylines, splines and groups as cutting edges', () => {
	it('cuts a line at a polyline instead of deleting the whole line', () => {
		const lineEntity = line(0, 0, 20, 0);
		setDrawing([lineEntity, polyLine([10, -5], [10, 5], [15, 5])]);
		handleMouseClick(new Point(15, 0), 1);
		const lines = getEntities().filter((entity) => entity.getType() === EntityName.Line);
		expect(lines).toHaveLength(1);
		const segment = lines[0].getShape() as Segment;
		expect(segment.start).toEqual(new Point(0, 0));
		expect(segment.end).toEqual(new Point(10, 0));
	});

	it('cuts a line at a spline', () => {
		setDrawing([
			line(0, 0, 20, 0),
			new SplineEntity([new Point(10, -5), new Point(11, 0), new Point(10, 5)]),
		]);
		handleMouseClick(new Point(18, 0), 1);
		const lines = getEntities().filter((entity) => entity.getType() === EntityName.Line);
		expect(lines).toHaveLength(1);
		const segment = lines[0].getShape() as Segment;
		expect(segment.start).toEqual(new Point(0, 0));
		// The spline goes through its fit points, so it crosses the line at its middle fit point
		expect(segment.end.x).toBeCloseTo(11);
		expect(segment.end.y).toBeCloseTo(0);
	});

	it('cuts a line at a member of a group', () => {
		setDrawing([line(0, 0, 20, 0), new GroupEntity([line(10, -5, 10, 5)])]);
		handleMouseClick(new Point(15, 0), 1);
		const segment = getEntities()
			.find((entity) => entity.getType() === EntityName.Line)
			?.getShape() as Segment;
		expect(segment.end).toEqual(new Point(10, 0));
	});
});

describe('trim arcs', () => {
	it('only removes the part of an arc between its start and the single crossing line', () => {
		setDrawing([new ArcEntity(new Point(0, 0), 50, 0, Math.PI, true), line(0, 0, 0, 100)]);
		handleMouseClick(pointOnCircle(50, 45), 1);
		const arcs = getArcs();
		expect(arcs).toHaveLength(1);
		expect(arcAngles(arcs[0])).toEqual([90, 180, 90]);
		expect(arcs[0].counterClockwise).toBe(true);
	});

	it('removes only the part of a clockwise arc between the two crossing lines', () => {
		setDrawing([
			new ArcEntity(new Point(0, 0), 50, Math.PI / 2, 0, false),
			new LineEntity(new Point(0, 0), pointOnCircle(100, 30)),
			new LineEntity(new Point(0, 0), pointOnCircle(100, 60)),
		]);
		handleMouseClick(pointOnCircle(50, 45), 1);
		const arcs = getArcs();
		expect(arcs).toHaveLength(2);
		const angles = arcs.map(arcAngles).sort((a, b) => b[0] - a[0]);
		expect(angles).toEqual([
			[90, 60, 30],
			[30, 0, 30],
		]);
		expect(arcs.every((arc) => !arc.counterClockwise)).toBe(true);
	});

	it('cuts a clockwise arc into pieces that follow its direction', () => {
		const arc = new ArcEntity(new Point(0, 0), 50, Math.PI / 2, 0, false);
		const pieces = arc
			.cutAtPoints([pointOnCircle(50, 30), pointOnCircle(50, 60)])
			.map((piece) => arcAngles(piece.getShape() as Arc));
		expect(pieces).toEqual([
			[90, 60, 30],
			[60, 30, 30],
			[30, 0, 30],
		]);
	});
});

describe('trimmed pieces keep the style and layer of the original', () => {
	function styled<T extends Entity>(entity: T): T {
		entity.lineColor = '#ff0000';
		entity.lineWidth = 3;
		entity.lineDash = [5, 5];
		entity.layerId = OTHER_LAYER.id;
		return entity;
	}

	function expectStyled(entities: Entity[]) {
		expect(entities.length).toBeGreaterThan(0);
		for (const entity of entities) {
			expect(entity.lineColor).toBe('#ff0000');
			expect(entity.lineWidth).toBe(3);
			expect(entity.lineDash).toEqual([5, 5]);
			expect(entity.layerId).toBe(OTHER_LAYER.id);
		}
	}

	it('keeps the style of a trimmed line', () => {
		const lineEntity = styled(line(0, 0, 20, 0));
		setDrawing([lineEntity, line(10, -5, 10, 5)]);
		handleMouseClick(new Point(15, 0), 1);
		expectStyled(getEntities().filter((entity) => entity.layerId !== ACTIVE_LAYER.id));
		expect(getEntities()).toHaveLength(2);
	});

	it('keeps the style of a trimmed arc', () => {
		setDrawing([styled(new ArcEntity(new Point(0, 0), 50, 0, Math.PI, true)), line(0, 0, 0, 100)]);
		handleMouseClick(pointOnCircle(50, 45), 1);
		expectStyled(getEntities().filter((entity) => entity.getType() === EntityName.Arc));
	});

	it('keeps the style of a trimmed circle', () => {
		setDrawing([styled(new CircleEntity(new Point(0, 0), 10)), line(-20, 0, 20, 0)]);
		handleMouseClick(new Point(0, 10), 1);
		expectStyled(getEntities().filter((entity) => entity.getType() === EntityName.Arc));
	});

	it('keeps the style of a trimmed rectangle', () => {
		setDrawing([
			styled(new RectangleEntity(new Point(0, 0), new Point(20, -20))),
			new CircleEntity(new Point(0, 0), 10),
		]);
		handleMouseClick(new Point(5, 0), 1);
		expectStyled(getEntities().filter((entity) => entity.getType() !== EntityName.Circle));
	});
});

describe('trim circles with a single crossing', () => {
	it('leaves a circle alone when a tangent line touches it', () => {
		const circle = new CircleEntity(new Point(0, 0), 10);
		const tangent = line(-20, 10, 20, 10);
		setDrawing([circle, tangent]);
		vi.spyOn(toast, 'info').mockImplementation(() => 0);
		expect(getTrimResult(new Point(0, -10), 1)).toBeNull();
		handleMouseClick(new Point(0, -10), 1);
		expect(getEntities()).toEqual([circle, tangent]);
		expect(toast.info).toHaveBeenCalledTimes(1);
	});

	it('leaves a circle alone when a line ends on it', () => {
		const circle = new CircleEntity(new Point(0, 0), 10);
		const touchingLine = line(10, 0, 20, 0);
		setDrawing([circle, touchingLine]);
		vi.spyOn(toast, 'info').mockImplementation(() => 0);
		handleMouseClick(new Point(-10, 0), 1);
		expect(getEntities()).toEqual([circle, touchingLine]);
	});
});

describe('trim entities that are not lines, arcs or circles', () => {
	it('shows a message when clicking an entity that cannot be trimmed', () => {
		const spline = new SplineEntity([new Point(0, 0), new Point(10, 5), new Point(20, 0)]);
		setDrawing([spline, line(10, -10, 10, 10)]);
		const infoSpy = vi.spyOn(toast, 'info').mockImplementation(() => 0);

		// The preview runs on every mouse move, it shouldn't show the message
		expect(getTrimResult(new Point(0, 0), 1)).toBeNull();
		expect(infoSpy).not.toHaveBeenCalled();

		handleMouseClick(new Point(0, 0), 1);
		expect(infoSpy).toHaveBeenCalledWith('Trim is not supported for spline');
		expect(getEntities()).toHaveLength(2);
	});

	it('trims the clicked segment of an open polyline and keeps the rest', () => {
		const polyLineEntity = polyLine([0, 0], [10, 0], [10, 10], [20, 10]);
		polyLineEntity.lineColor = '#00ff00';
		setDrawing([polyLineEntity, line(5, -5, 5, 5)]);
		handleMouseClick(new Point(7, 0), 1);

		const pieces = getEntities().filter((entity) => entity.lineColor === '#00ff00');
		expect(pieces).toHaveLength(2);
		const [first, second] = pieces;
		expect(first.getType()).toBe(EntityName.Line);
		expect(pathPoints(first)).toEqual([
			[0, 0],
			[5, 0],
		]);
		expect(second.getType()).toBe(EntityName.PolyLine);
		expect(pathPoints(second)).toEqual([
			[10, 0],
			[10, 10],
			[20, 10],
		]);
	});

	it('trims the clicked segment of a closed polyline into one open polyline', () => {
		setDrawing([polyLine([0, 0], [10, 0], [10, 10], [0, 10], [0, 0]), line(5, -5, 5, 15)]);
		handleMouseClick(new Point(7, 0), 1);

		const polyLines = getEntities().filter((entity) => entity.getType() === EntityName.PolyLine);
		expect(polyLines).toHaveLength(1);
		expect(pathPoints(polyLines[0])).toEqual([
			[10, 0],
			[10, 10],
			[0, 10],
			[0, 0],
			[5, 0],
		]);
	});

	it('trims a polyline with a segment that is stored in the opposite direction', () => {
		const reversedPolyLine = new PolyLineEntity([
			line(0, 0, 10, 0),
			line(10, 10, 10, 0),
			line(10, 10, 20, 10),
		]);
		const cuttingLine = line(5, 5, 15, 5);
		setDrawing([reversedPolyLine, cuttingLine]);
		handleMouseClick(new Point(10, 7), 1);

		const remaining = getEntities().filter((entity) => entity !== cuttingLine);
		const types = remaining.map((entity) => entity.getType()).sort();
		expect(types).toEqual([EntityName.Line, EntityName.PolyLine]);
		const lineEntity = remaining.find((entity) => entity.getType() === EntityName.Line);
		expect(pathPoints(lineEntity as Entity)).toEqual([
			[10, 10],
			[20, 10],
		]);
		const polyLineEntity = remaining.find((entity) => entity.getType() === EntityName.PolyLine);
		expect(pathPoints(polyLineEntity as Entity)).toEqual([
			[0, 0],
			[10, 0],
			[10, 5],
		]);
	});

	it('trims the arc of a rounded polyline, also when the arc is stored in the opposite direction', () => {
		// A rectangle with a rounded right side, the arc goes clockwise from the top to the bottom
		const roundedPolyLine = new PolyLineEntity([
			line(0, 0, 10, 0),
			new ArcEntity(new Point(10, 5), 5, Math.PI / 2, -Math.PI / 2, false),
			line(10, 10, 0, 10),
			line(0, 10, 0, 0),
		]);
		setDrawing([roundedPolyLine, line(5, 7, 20, 7)]);
		handleMouseClick(new Point(10 + 5 * Math.cos(-Math.PI / 4), 5 + 5 * Math.sin(-Math.PI / 4)), 1);

		const polyLines = getEntities().filter((entity) => entity.getType() === EntityName.PolyLine);
		expect(polyLines).toHaveLength(1);
		const crossingX = Math.round((10 + Math.sqrt(21)) * 1000) / 1000;
		expect(pathPoints(polyLines[0])).toEqual([
			[crossingX, 7],
			[10, 10],
			[0, 10],
			[0, 0],
			[10, 0],
		]);
		// The remaining part of the arc runs from the crossing up to the top of the arc
		const remainingArc = polyLines[0].getEdges()[0] as Arc;
		expect(remainingArc.center).toEqual(new Point(10, 5));
		expect(remainingArc.sweep * TO_DEGREES).toBeCloseTo(90 - Math.asin(2 / 5) * TO_DEGREES);
	});

	it('trims a rectangle into one open polyline', () => {
		setDrawing([
			new RectangleEntity(new Point(0, 0), new Point(20, -20)),
			new CircleEntity(new Point(0, 0), 10),
		]);
		handleMouseClick(new Point(5, 0), 1);

		const entities = getEntities();
		expect(entities).toHaveLength(2);
		const polyLineEntity = entities.find((entity) => entity.getType() === EntityName.PolyLine);
		expect(polyLineEntity).toBeDefined();
		expect(pathPoints(polyLineEntity as Entity)).toEqual([
			[10, 0],
			[20, 0],
			[20, -20],
			[0, -20],
			[0, 0],
		]);
	});
});
