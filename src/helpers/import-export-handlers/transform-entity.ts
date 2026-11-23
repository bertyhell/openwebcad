import { type Arc, Matrix, Point, type Polygon, Vector } from '@flatten-js/core';
import type { ArcEntity } from '../../entities/ArcEntity.ts';
import type { CircleEntity } from '../../entities/CircleEntity.ts';
import { EllipseEntity } from '../../entities/EllipseEntity.ts';
import { type Entity, EntityName } from '../../entities/Entity.ts';
import { FillEntity } from '../../entities/FillEntity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { PointEntity } from '../../entities/PointEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';
import { SplineEntity } from '../../entities/SplineEntity.ts';
import { TextEntity } from '../../entities/TextEntity.ts';
import { copyEntityBaseProperties } from '../copy-entity-base-properties.ts';
import { getFillPolylines } from './fill-polylines.ts';

/**
 * Relative difference below which a transformation is considered to scale both axes the same
 * Cad files often contain scale factors like 0.99999999 that are meant to be 1
 */
const SIMILARITY_TOLERANCE = 1e-6;

/**
 * Largest angle between two points that are used to approximate a distorted arc with a spline
 */
const SPLINE_SAMPLE_ANGLE = Math.PI / 16;

/**
 * Largest angle between two points that are used to approximate a distorted arc with line segments
 */
const LINE_SAMPLE_ANGLE = Math.PI / 36;

const ORIGIN = new Point(0, 0);

/**
 * Transformation that keeps shapes intact: a uniform scale, a rotation and an optional mirroring
 */
interface Similarity {
	scale: number;
	angle: number;
	isMirrored: boolean;
}

export function transformPoint(matrix: Matrix, point: Point): Point {
	const [x, y] = matrix.transform([point.x, point.y]);
	return new Point(x, y);
}

function transformVector(matrix: Matrix, vector: Vector): Vector {
	return new Vector(
		matrix.a * vector.x + matrix.c * vector.y,
		matrix.b * vector.x + matrix.d * vector.y
	);
}

function getDeterminant(matrix: Matrix): number {
	return matrix.a * matrix.d - matrix.b * matrix.c;
}

function isIdentity(matrix: Matrix): boolean {
	return matrix.equalTo(new Matrix());
}

/**
 * Splits the matrix into a mirroring over the x axis, a uniform scale and a rotation, followed by its translation
 * Returns null when the matrix scales the axes differently or skews them
 */
function getSimilarity(matrix: Matrix): Similarity | null {
	const isMirrored = getDeterminant(matrix) < 0;
	// Mirroring over the x axis flips the second column, what remains is a rotation with a uniform scale: [a -b; b a]
	const c = isMirrored ? -matrix.c : matrix.c;
	const d = isMirrored ? -matrix.d : matrix.d;
	const scale = Math.hypot(matrix.a, matrix.b);
	const tolerance = SIMILARITY_TOLERANCE * scale;
	if (scale === 0 || Math.abs(matrix.a - d) > tolerance || Math.abs(matrix.b + c) > tolerance) {
		return null;
	}
	return { scale, angle: Math.atan2(matrix.b, matrix.a), isMirrored };
}

function applySimilarity(entity: Entity, similarity: Similarity, matrix: Matrix): void {
	if (similarity.isMirrored) {
		entity.mirror(new LineEntity(ORIGIN, new Point(1, 0)));
	}
	if (similarity.scale !== 1) {
		entity.scale(ORIGIN, similarity.scale);
	}
	if (similarity.angle) {
		entity.rotate(ORIGIN, similarity.angle);
	}
	if (matrix.tx || matrix.ty) {
		entity.move(matrix.tx, matrix.ty);
	}
}

/**
 * Ellipse through the points center + u * cos(t) + v * sin(t)
 * Any two conjugate half diameters describe an ellipse, the major and minor axis are the conjugate diameters that are perpendicular
 */
function createEllipseFromConjugateAxes(center: Point, u: Vector, v: Vector): EllipseEntity {
	// The distance to the center is the largest at this parameter, which is the end of the major axis
	const majorParameter = 0.5 * Math.atan2(2 * u.dot(v), u.dot(u) - v.dot(v));
	const axis1 = u.multiply(Math.cos(majorParameter)).add(v.multiply(Math.sin(majorParameter)));
	const axis2 = v.multiply(Math.cos(majorParameter)).subtract(u.multiply(Math.sin(majorParameter)));
	const [majorAxis, minorAxis] = axis1.length >= axis2.length ? [axis1, axis2] : [axis2, axis1];
	return new EllipseEntity(
		center,
		center.translate(majorAxis),
		majorAxis.length > 0 ? minorAxis.length / majorAxis.length : 1
	);
}

/**
 * Points along an arc from its start point to its end point, at most maxStepAngle apart
 */
export function getArcPoints(arc: Arc, maxStepAngle: number): Point[] {
	const stepCount = Math.max(2, Math.ceil(arc.sweep / maxStepAngle));
	const direction = arc.counterClockwise ? 1 : -1;
	return Array.from({ length: stepCount + 1 }, (_, index) => {
		const angle = arc.startAngle + (direction * arc.sweep * index) / stepCount;
		return new Point(
			arc.center.x + arc.r.valueOf() * Math.cos(angle),
			arc.center.y + arc.r.valueOf() * Math.sin(angle)
		);
	});
}

function createLinesThroughPoints(points: Point[]): LineEntity[] {
	return points.slice(1).map((point, index) => new LineEntity(points[index], point));
}

/**
 * Polylines can only contain lines and arcs, so their distorted arcs become short line segments
 */
function distortPolyLine(polyLine: PolyLineEntity, matrix: Matrix): PolyLineEntity {
	return new PolyLineEntity(
		polyLine.entities.flatMap((segment) => {
			if (segment.getType() === EntityName.Arc) {
				return createLinesThroughPoints(
					getArcPoints(segment.getShape() as Arc, LINE_SAMPLE_ANGLE).map((point) =>
						transformPoint(matrix, point)
					)
				);
			}
			return [
				new LineEntity(
					transformPoint(matrix, segment.getStartPoint()),
					transformPoint(matrix, segment.getEndPoint())
				),
			];
		})
	);
}

/**
 * Transforms a text without mirroring its letters, since texts are always drawn readable
 * A mirrored text keeps the place it covers, and reads in the direction that is closest to left to right
 */
function transformText(text: TextEntity, matrix: Matrix): TextEntity {
	const options = text.getOptions();
	const direction = transformVector(matrix, options.textDirection);
	const determinant = getDeterminant(matrix);
	if (direction.length === 0 || determinant === 0) {
		return text;
	}
	// The height of the text scales with the distance perpendicular to its direction
	const fontSize = (options.fontSize * Math.abs(determinant)) / direction.length;
	let textDirection = direction.normalize();
	let textAlign = options.textAlign;
	if (determinant < 0 && textDirection.x < 0) {
		// Reading in the opposite direction from the other end covers the same place, without being upside down
		textDirection = textDirection.invert();
		textAlign = textAlign === 'left' ? 'right' : textAlign === 'right' ? 'left' : textAlign;
	}
	return copyEntityBaseProperties(
		text,
		new TextEntity(text.getLabel(), transformPoint(matrix, text.getBasePoint()), {
			...options,
			fontSize,
			textDirection,
			textAlign,
		})
	);
}

/**
 * Applies a transformation that scales the x and y axis differently, or skews them
 * Shapes that don't keep their type are converted: circles become ellipses, arcs become splines
 */
function distortEntity(entity: Entity, matrix: Matrix): Entity {
	const point = (input: Point) => transformPoint(matrix, input);
	switch (entity.getType()) {
		case EntityName.Line: {
			const line = entity as LineEntity;
			return new LineEntity(point(line.getStartPoint()), point(line.getEndPoint()));
		}
		case EntityName.Point:
			return new PointEntity(point((entity as PointEntity).point));
		case EntityName.Circle: {
			const circle = entity as CircleEntity;
			const radius = circle.getRadius();
			return createEllipseFromConjugateAxes(
				point(circle.getCenter()),
				transformVector(matrix, new Vector(radius, 0)),
				transformVector(matrix, new Vector(0, radius))
			);
		}
		case EntityName.Ellipse: {
			const ellipse = entity as EllipseEntity;
			const majorAxis = new Vector(ellipse.getCenter(), ellipse.getMajorAxisEnd());
			const minorAxis = majorAxis.rotate90CCW().multiply(ellipse.getRatio());
			return createEllipseFromConjugateAxes(
				point(ellipse.getCenter()),
				transformVector(matrix, majorAxis),
				transformVector(matrix, minorAxis)
			);
		}
		case EntityName.Arc:
			return new SplineEntity(
				getArcPoints((entity as ArcEntity).getShape() as Arc, SPLINE_SAMPLE_ANGLE).map(point)
			);
		case EntityName.Spline:
			return new SplineEntity((entity as SplineEntity).getFitPoints().map(point));
		case EntityName.PolyLine:
			return distortPolyLine(entity as PolyLineEntity, matrix);
		case EntityName.Rectangle: {
			const corners = (entity.getShape() as Polygon).vertices.map(point);
			return new PolyLineEntity(createLinesThroughPoints([...corners, corners[0]]));
		}
		case EntityName.Fill: {
			const fill = entity as FillEntity;
			const [border, ...holes] = getFillPolylines(fill).map((polyLine) =>
				distortPolyLine(polyLine, matrix)
			);
			const distortedFill = new FillEntity(border, holes);
			distortedFill.fillColor = fill.fillColor;
			return distortedFill;
		}
		default: {
			// Other entities can't be distorted, approximate the transformation by scaling both axes the same
			const determinant = getDeterminant(matrix);
			applySimilarity(
				entity,
				{
					scale: Math.sqrt(Math.abs(determinant)),
					angle: Math.atan2(matrix.b, matrix.a),
					isMirrored: determinant < 0,
				},
				matrix
			);
			return entity;
		}
	}
}

/**
 * Applies an affine transformation to an entity, eg: the transformation of a block that is inserted in a dxf file
 * The entity is changed when the transformation keeps its shape, otherwise a new entity is returned with the same style and layer
 */
export function transformEntity(entity: Entity, matrix: Matrix): Entity {
	if (isIdentity(matrix)) {
		return entity;
	}
	if (entity instanceof TextEntity) {
		return transformText(entity, matrix);
	}
	const similarity = getSimilarity(matrix);
	if (similarity) {
		applySimilarity(entity, similarity, matrix);
		return entity;
	}
	return copyEntityBaseProperties(entity, distortEntity(entity, matrix));
}
