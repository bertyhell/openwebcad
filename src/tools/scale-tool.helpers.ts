import { Point } from '@flatten-js/core';
import { toast } from 'react-toastify';
import { EPSILON } from '../App.consts';
import type { Entity } from '../entities/Entity';
import { pointDistance } from '../helpers/distance-between-points';

const SCALE_FACTOR_TOAST_ID = 'scale-factor-zero';

/**
 * Scale entities by base vector to destination scale vector
 * A reference length or a new length of 0 leaves the entities as they are,
 * since scaling by 0 would collapse them into a single point
 * @param entities
 * @param baseVectorStartPoint
 * @param baseVectorEndPoint
 * @param scaleVectorEndPoint
 */
export function scaleEntities(
	entities: Entity[],
	baseVectorStartPoint: Point,
	baseVectorEndPoint: Point,
	scaleVectorEndPoint: Point
) {
	const baseLength = pointDistance(baseVectorStartPoint, baseVectorEndPoint);
	if (baseLength < EPSILON) {
		showScaleFactorToast('The reference length is 0, press ESC and select another reference point');
		return;
	}
	const scaleFactor = pointDistance(baseVectorStartPoint, scaleVectorEndPoint) / baseLength;
	if (scaleFactor < EPSILON) {
		showScaleFactorToast('The new length can not be 0, select a point away from the origin');
		return;
	}
	for (const entity of entities) {
		entity.scale(baseVectorStartPoint, scaleFactor);
	}
}

/**
 * Scaling also runs for every frame of the preview, the fixed id shows the message only once while the mouse stays there
 */
function showScaleFactorToast(message: string) {
	if (!toast.isActive(SCALE_FACTOR_TOAST_ID)) {
		toast.info(message, { toastId: SCALE_FACTOR_TOAST_ID });
	}
}

/**
 * Point for a typed scale factor, or null after telling the user why the factor can't be used
 * The factor has to be larger than 0, and a reference length of 0 can't be scaled by any factor
 */
export function getPointForTypedScaleFactor(
	baseVectorStartPoint: Point,
	baseVectorEndPoint: Point,
	scaleFactor: number
): Point | null {
	if (scaleFactor <= 0) {
		toast.info('The scale factor has to be larger than 0');
		return null;
	}
	if (pointDistance(baseVectorStartPoint, baseVectorEndPoint) < EPSILON) {
		toast.info('The reference length is 0, press ESC and select another reference point');
		return null;
	}
	return getPointForScaleFactor(baseVectorStartPoint, baseVectorEndPoint, scaleFactor);
}

/**
 * Point on the base vector that results in the given scale factor
 */
export function getPointForScaleFactor(
	baseVectorStartPoint: Point,
	baseVectorEndPoint: Point,
	scaleFactor: number
): Point {
	return new Point(
		baseVectorStartPoint.x + (baseVectorEndPoint.x - baseVectorStartPoint.x) * scaleFactor,
		baseVectorStartPoint.y + (baseVectorEndPoint.y - baseVectorStartPoint.y) * scaleFactor
	);
}
