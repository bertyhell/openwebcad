import { Arc, type Point, type Segment } from '@flatten-js/core';
import type { StartAndEndpointEntity } from '../../App.types.ts';
import { ArcEntity } from '../../entities/ArcEntity.ts';
import type { FillEntity } from '../../entities/FillEntity.ts';
import { LineEntity } from '../../entities/LineEntity.ts';
import { PolyLineEntity } from '../../entities/PolyLineEntity.ts';

/**
 * Outline and holes of a fill as separate polylines, the outline comes first
 * The fill doesn't expose its polylines, so they are rebuilt from its edges by grouping the edges that touch each other
 */
export function getFillPolylines(fill: FillEntity): PolyLineEntity[] {
	const segments: StartAndEndpointEntity[] = fill
		.getEdges()
		.map((edge) => (edge instanceof Arc ? new ArcEntity(edge) : new LineEntity(edge as Segment)));
	const groups: StartAndEndpointEntity[][] = [];
	for (const segment of segments) {
		const touches = (point: Point) =>
			point.equalTo(segment.getStartPoint()) || point.equalTo(segment.getEndPoint());
		const touchingGroups = groups.filter((group) =>
			group.some((other) => touches(other.getStartPoint()) || touches(other.getEndPoint()))
		);
		if (!touchingGroups.length) {
			groups.push([segment]);
			continue;
		}
		// A segment can connect two groups that were found earlier, merge them into the first one to keep the outline first
		const mergedGroup = [...touchingGroups.flat(), segment];
		groups.splice(groups.indexOf(touchingGroups[0]), 1, mergedGroup);
		for (const touchingGroup of touchingGroups.slice(1)) {
			groups.splice(groups.indexOf(touchingGroup), 1);
		}
	}
	return groups.map((group) => {
		const polyLine = new PolyLineEntity(group);
		polyLine.layerId = fill.layerId;
		return polyLine;
	});
}
