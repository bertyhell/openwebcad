import {toast} from 'react-toastify';

// A small type alias for clarity.
type Point = { x: number; y: number };

// Helper: returns the midpoint between two points.
function midpoint(a: Point, b: Point): Point {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Helper: distance from point p to the line defined by points a and b.
function distancePointToLine(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const mag = Math.sqrt(dx * dx + dy * dy);
	if (mag === 0) return Math.hypot(p.x - a.x, p.y - a.y);
	return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / mag;
}

/**
 * Recursively subdivides a cubic Bezier until the control points lie
 * close enough (within tolerance) to the chord.
 */
function approximateCubicBezier(
	p0: Point,
	p1: Point,
	p2: Point,
	p3: Point,
	tolerance: number
): Point[] {
	function recursive(a: Point, b: Point, c: Point, d: Point, tol: number): Point[] {
		// Check the “flatness” by measuring the distance from the two control points
		// to the line connecting the endpoints.
		const d1 = distancePointToLine(b, a, d);
		const d2 = distancePointToLine(c, a, d);
		if (Math.max(d1, d2) < tol) {
			return [a, d];
		}
		// Subdivide using de Casteljau’s algorithm.
		const ab = midpoint(a, b);
		const bc = midpoint(b, c);
		const cd = midpoint(c, d);
		const abc = midpoint(ab, bc);
		const bcd = midpoint(bc, cd);
		const abcd = midpoint(abc, bcd);
		const left = recursive(a, ab, abc, abcd, tol);
		const right = recursive(abcd, bcd, cd, d, tol);
		// Avoid duplicating the middle point.
		return left.slice(0, -1).concat(right);
	}
	return recursive(p0, p1, p2, p3, tolerance);
}

/**
 * Recursively subdivides a quadratic Bezier curve.
 */
function approximateQuadraticBezier(p0: Point, p1: Point, p2: Point, tolerance: number): Point[] {
	function recursive(a: Point, b: Point, c: Point, tol: number): Point[] {
		const d = distancePointToLine(b, a, c);
		if (d < tol) {
			return [a, c];
		}
		const ab = midpoint(a, b);
		const bc = midpoint(b, c);
		const abc = midpoint(ab, bc);
		const left = recursive(a, ab, abc, tol);
		const right = recursive(abc, bc, c, tol);
		return left.slice(0, -1).concat(right);
	}
	return recursive(p0, p1, p2, tolerance);
}

/**
 * Approximates an elliptical arc defined by the SVG “A” command.
 *
 * This function uses the standard SVG algorithm to compute the arc’s
 * center and angles and then divides the arc into small segments so that
 * the chord error is below the given tolerance.
 */
function approximateArc(
	p0: Point,
	rx: number,
	ry: number,
	phi: number,
	largeArcFlag: boolean,
	sweepFlag: boolean,
	p2: Point,
	tolerance: number
): Point[] {
	const phiRad = (phi * Math.PI) / 180;
	const dx = (p0.x - p2.x) / 2;
	const dy = (p0.y - p2.y) / 2;
	let rxInternal = rx;
	let ryInternal = ry;

	// Step 1: Compute the transformed start point.
	const x1p = Math.cos(phiRad) * dx + Math.sin(phiRad) * dy;
	const y1p = -Math.sin(phiRad) * dx + Math.cos(phiRad) * dy;

	// Ensure the radii are large enough.
	let rxSq = rxInternal * rxInternal;
	let rySq = ryInternal * ryInternal;
	const x1pSq = x1p * x1p;
	const y1pSq = y1p * y1p;
	const lambda = x1pSq / rxSq + y1pSq / rySq;
	if (lambda > 1) {
		const factor = Math.sqrt(lambda);
		rxInternal *= factor;
		ryInternal *= factor;
		rxSq = rxInternal * rxInternal;
		rySq = ryInternal * ryInternal;
	}

	// Step 2: Compute the center.
	const sign = largeArcFlag === sweepFlag ? -1 : 1;
	const numerator = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
	const denominator = rxSq * y1pSq + rySq * x1pSq;
	const coefficient = sign * Math.sqrt(Math.max(0, numerator / denominator));
	const cxp = (coefficient * (rxInternal * y1p)) / ryInternal;
	const cyp = (coefficient * (-ryInternal * x1p)) / rxInternal;

	// Step 3: Transform back to original coordinates.
	const cx = Math.cos(phiRad) * cxp - Math.sin(phiRad) * cyp + (p0.x + p2.x) / 2;
	const cy = Math.sin(phiRad) * cxp + Math.cos(phiRad) * cyp + (p0.y + p2.y) / 2;

	// Step 4: Compute the start and delta angles.
	function angle(u: Point, v: Point): number {
		const dot = u.x * v.x + u.y * v.y;
		const len = Math.sqrt((u.x * u.x + u.y * u.y) * (v.x * v.x + v.y * v.y));
		let ang = Math.acos(Math.max(-1, Math.min(1, dot / len)));
		if (u.x * v.y - u.y * v.x < 0) ang = -ang;
		return ang;
	}

	const v1 = { x: (x1p - cxp) / rx, y: (y1p - cyp) / ry };
	const v2 = { x: (-x1p - cxp) / rx, y: (-y1p - cyp) / ry };
	const startAngle = angle({ x: 1, y: 0 }, v1);
	let deltaAngle = angle(v1, v2);
	if (!sweepFlag && deltaAngle > 0) {
		deltaAngle -= 2 * Math.PI;
	} else if (sweepFlag && deltaAngle < 0) {
		deltaAngle += 2 * Math.PI;
	}
	const totalAngle = deltaAngle;

	// Choose the number of segments so that the chord error is below tolerance.
	const rApprox = Math.max(rx, ry);
	const segCount = Math.max(
		1,
		Math.ceil(Math.abs(totalAngle) / (2 * Math.acos(1 - tolerance / rApprox)))
	);
	const points: Point[] = [];
	for (let i = 0; i <= segCount; i++) {
		const theta = startAngle + (totalAngle * i) / segCount;
		const x =
			cx + rx * Math.cos(phiRad) * Math.cos(theta) - ry * Math.sin(phiRad) * Math.sin(theta);
		const y =
			cy + rx * Math.sin(phiRad) * Math.cos(theta) + ry * Math.cos(phiRad) * Math.sin(theta);
		points.push({ x, y });
	}
	return points;
}

// A simple SVG path command type.
interface SvgCommand {
	type: string;
	args: number[];
}

/**
 * A basic parser for an SVG path string. It splits the string into commands
 * (like "M", "L", "C", etc.) and extracts the numeric parameters.
 */
function parseSvgPath(path: string): SvgCommand[] {
	const commands: SvgCommand[] = [];
	const re = /([MmLlHhVvCcQqAaZz])([^MmLlHhVvCcQqAaZz]*)/g;
	let match: RegExpExecArray | null = re.exec(path);
	while (match !== null) {
		const type = match[1];
		const argsStr = match[2].trim();
		const args: number[] = [];
		if (argsStr.length > 0) {
			// Match numbers (including decimals, negatives, exponents)
			const numberRe = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
			let numberMatch: RegExpExecArray | null = numberRe.exec(argsStr);
			while (numberMatch !== null) {
				args.push(Number.parseFloat(numberMatch[0]));
				numberMatch = numberRe.exec(argsStr);
			}
		}
		commands.push({ type, args });
		match = re.exec(path);
	}
	return commands;
}

/**
 * Converts an SVG path (a string) into a list of straight-line segments.
 *
 * Each segment is represented as an object with start point (x1,y1)
 * and end point (x2,y2). Curved path segments (cubic, quadratic, arc)
 * are approximated with a polyline whose error is below a given tolerance.
 *
 * @param svgPath - An SVG path string (for example, "M 152.982 124.448 L 176.73 156.849 …")
 * @returns An array of line segments.
 */
export function svgPathToSegments(
	svgPath: string
): { x1: number; y1: number; x2: number; y2: number }[] {
	const segments: { x1: number; y1: number; x2: number; y2: number }[] = [];
	let current: Point = { x: 0, y: 0 };
	let startPoint: Point = { x: 0, y: 0 };
	const tolerance = 0.5; // adjust this value to get a closer or looser approximation

	const commands = parseSvgPath(svgPath);

	for (const command of commands) {
		// Destructure the command type and its numeric arguments.
		let type: string = command.type;
		const args: number[] = command.args;
		let idx = 0;
		if (type.toLowerCase() === 'z') {
			// Close the current subpath.
			if (current.x === startPoint.x && current.y === startPoint.y) {
				idx++;
				continue;
			}
			segments.push({ x1: current.x, y1: current.y, x2: startPoint.x, y2: startPoint.y });
			current = { ...startPoint };
			// "Z" has no arguments so exit the loop.
			idx++;
			continue; // end of the line
		}
		// Some commands allow multiple coordinate pairs.
		while (idx < args.length || type.toLowerCase() === 'z') {
			switch (type) {
				case 'M': {
					// Absolute moveto.
					const x = args[idx++];
					const y = args[idx++];
					current = { x, y };
					startPoint = { x, y };
					// If extra pairs follow, treat them as implicit "L" commands.
					type = 'L';
					break;
				}
				case 'm': {
					// Relative moveto.
					const x = current.x + args[idx++];
					const y = current.y + args[idx++];
					current = { x, y };
					startPoint = { x, y };
					type = 'l';
					break;
				}
				case 'L': {
					// Absolute lineto.
					const x = args[idx++];
					const y = args[idx++];
					segments.push({ x1: current.x, y1: current.y, x2: x, y2: y });
					current = { x, y };
					break;
				}
				case 'l': {
					// Relative lineto.
					const x = current.x + args[idx++];
					const y = current.y + args[idx++];
					segments.push({ x1: current.x, y1: current.y, x2: x, y2: y });
					current = { x, y };
					break;
				}
				case 'H': {
					// Absolute horizontal lineto.
					const x = args[idx++];
					segments.push({ x1: current.x, y1: current.y, x2: x, y2: current.y });
					current = { x, y: current.y };
					break;
				}
				case 'h': {
					// Relative horizontal lineto.
					const x = current.x + args[idx++];
					segments.push({ x1: current.x, y1: current.y, x2: x, y2: current.y });
					current = { x, y: current.y };
					break;
				}
				case 'V': {
					// Absolute vertical lineto.
					const y = args[idx++];
					segments.push({ x1: current.x, y1: current.y, x2: current.x, y2: y });
					current = { x: current.x, y };
					break;
				}
				case 'v': {
					// Relative vertical lineto.
					const y = current.y + args[idx++];
					segments.push({ x1: current.x, y1: current.y, x2: current.x, y2: y });
					current = { x: current.x, y };
					break;
				}
				case 'C': {
					// Cubic Bezier: parameters are x1, y1, x2, y2, x, y.
					const x1 = args[idx++];
					const y1 = args[idx++];
					const x2 = args[idx++];
					const y2 = args[idx++];
					const x = args[idx++];
					const y = args[idx++];
					const curvePoints = approximateCubicBezier(
						current,
						{ x: x1, y: y1 },
						{ x: x2, y: y2 },
						{ x, y },
						tolerance
					);
					// Convert the polyline into segments.
					for (let i = 0; i < curvePoints.length - 1; i++) {
						segments.push({
							x1: curvePoints[i].x,
							y1: curvePoints[i].y,
							x2: curvePoints[i + 1].x,
							y2: curvePoints[i + 1].y,
						});
					}
					current = { x, y };
					break;
				}
				case 'c': {
					// Relative cubic Bezier.
					const x1 = current.x + args[idx++];
					const y1 = current.y + args[idx++];
					const x2 = current.x + args[idx++];
					const y2 = current.y + args[idx++];
					const x = current.x + args[idx++];
					const y = current.y + args[idx++];
					const curvePoints = approximateCubicBezier(
						current,
						{ x: x1, y: y1 },
						{ x: x2, y: y2 },
						{ x, y },
						tolerance
					);
					for (let i = 0; i < curvePoints.length - 1; i++) {
						segments.push({
							x1: curvePoints[i].x,
							y1: curvePoints[i].y,
							x2: curvePoints[i + 1].x,
							y2: curvePoints[i + 1].y,
						});
					}
					current = { x, y };
					break;
				}
				case 'Q': {
					// Quadratic Bezier: parameters are x1, y1, x, y.
					const x1 = args[idx++];
					const y1 = args[idx++];
					const x = args[idx++];
					const y = args[idx++];
					const curvePoints = approximateQuadraticBezier(
						current,
						{ x: x1, y: y1 },
						{ x, y },
						tolerance
					);
					for (let i = 0; i < curvePoints.length - 1; i++) {
						segments.push({
							x1: curvePoints[i].x,
							y1: curvePoints[i].y,
							x2: curvePoints[i + 1].x,
							y2: curvePoints[i + 1].y,
						});
					}
					current = { x, y };
					break;
				}
				case 'q': {
					// Relative quadratic Bezier.
					const x1 = current.x + args[idx++];
					const y1 = current.y + args[idx++];
					const x = current.x + args[idx++];
					const y = current.y + args[idx++];
					const curvePoints = approximateQuadraticBezier(
						current,
						{ x: x1, y: y1 },
						{ x, y },
						tolerance
					);
					for (let i = 0; i < curvePoints.length - 1; i++) {
						segments.push({
							x1: curvePoints[i].x,
							y1: curvePoints[i].y,
							x2: curvePoints[i + 1].x,
							y2: curvePoints[i + 1].y,
						});
					}
					current = { x, y };
					break;
				}
				case 'A': {
					// Arc: parameters are rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y.
					const rx = args[idx++];
					const ry = args[idx++];
					const xAxisRotation = args[idx++];
					const largeArcFlag = !!args[idx++];
					const sweepFlag = !!args[idx++];
					const x = args[idx++];
					const y = args[idx++];
					const arcPoints = approximateArc(
						current,
						rx,
						ry,
						xAxisRotation,
						largeArcFlag,
						sweepFlag,
						{ x, y },
						tolerance
					);
					for (let i = 0; i < arcPoints.length - 1; i++) {
						segments.push({
							x1: arcPoints[i].x,
							y1: arcPoints[i].y,
							x2: arcPoints[i + 1].x,
							y2: arcPoints[i + 1].y,
						});
					}
					current = { x, y };
					break;
				}
				case 'a': {
					// Relative arc.
					const rx = args[idx++];
					const ry = args[idx++];
					const xAxisRotation = args[idx++];
					const largeArcFlag = !!args[idx++];
					const sweepFlag = !!args[idx++];
					const x = current.x + args[idx++];
					const y = current.y + args[idx++];
					const arcPoints = approximateArc(
						current,
						rx,
						ry,
						xAxisRotation,
						largeArcFlag,
						sweepFlag,
						{ x, y },
						tolerance
					);
					for (let i = 0; i < arcPoints.length - 1; i++) {
						segments.push({
							x1: arcPoints[i].x,
							y1: arcPoints[i].y,
							x2: arcPoints[i + 1].x,
							y2: arcPoints[i + 1].y,
						});
					}
					current = { x, y };
					break;
				}
				default: {
					toast.error(`Unsupported SVG command type: ${type} ${args.join(' ')}`);
					console.error(`unsupported SVG command type: ${type} ${args.join(' ')}`);
					// Unsupported commands can be skipped.
					idx = args.length;
					break;
				}
			}
		}
	}

	return segments;
}
