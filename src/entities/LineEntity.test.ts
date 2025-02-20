import { describe, expect, it } from 'vitest';
import {Point} from "@flatten-js/core";
import {LineEntity} from "./LineEntity.ts";
import {TO_DEGREES} from "../App.consts.ts";

describe('getAngle', () => {
    it('should return 0 for a horizontal line', () => {
        const point1 = new Point(0, 0);
        const point2 = new Point(1, 0);
        const lineEntity = new LineEntity(point1, point2);
        expect(lineEntity.getAngle() * TO_DEGREES).toBeCloseTo(0);
    });

    it('should return 90 degrees for a vertical line', () => {
        const point1 = new Point(0, 0);
        const point2 = new Point(0, 1);
        const lineEntity = new LineEntity(point1, point2);
        expect(lineEntity.getAngle() * TO_DEGREES).toBeCloseTo(90);
    });

    it('should return 45 degrees for a slope of 1', () => {
        const point1 = new Point(0, 0);
        const point2 = new Point(1, 1);
        const lineEntity = new LineEntity(point1, point2);
        expect(lineEntity.getAngle() * TO_DEGREES).toBeCloseTo(45);
    });

    it('should return 135 degrees for a slope of -1', () => {
        const point1 = new Point(0, 0);
        const point2 = new Point(-1, 1);
        const lineEntity = new LineEntity(point1, point2);
        expect(lineEntity.getAngle() * TO_DEGREES).toBeCloseTo(135);
    });

    it('should return 30 degrees for a slope of √3/3', () => {
        const point1 = new Point(0, 0);
        const point2 = new Point(1, Math.tan(Math.PI / 6)); // tan(30°) = 1/√3 ≈ 0.577
        const lineEntity = new LineEntity(point1, point2);
        expect(lineEntity.getAngle() * TO_DEGREES).toBeCloseTo(30);
    });

    it('should handle NaN slope gracefully', () => {
        const point1 = new Point(0, 0);
        const point2 = new Point(0, 0);
        const lineEntity = new LineEntity(point1, point2); // zero-length segment
        expect(lineEntity.getAngle() * TO_DEGREES).toBeCloseTo(90);
    });
});
