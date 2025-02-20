import {LineEntity} from "../entities/LineEntity.ts";

export function mirrorAngleOverAxis(angle: number, mirrorAxis: LineEntity) {
	const mirrorAngle = mirrorAxis.getAngle();
	return mirrorAngle * 2 - angle;
}
