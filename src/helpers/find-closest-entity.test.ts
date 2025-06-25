import {Point} from "@flatten-js/core";
import {describe, expect, it} from 'vitest';
import {findClosestEntity} from './find-closest-entity';
import {arcAndLineEntitiesMock} from "./find-closest-entity.mocks.ts";
import {getEntitiesAndLayersFromJsonObject,} from './import-export-handlers/import-entities-from-json.ts';

describe('findClosestEntity', () => {
	it('should return the arc as the closest entity', async () => {
		const mockEntitiesAndLayers = await getEntitiesAndLayersFromJsonObject(arcAndLineEntitiesMock);
		const clickPoint = new Point(600, 1108);
		const closestEntityInfo = findClosestEntity(clickPoint, mockEntitiesAndLayers.entities);
		expect(closestEntityInfo).toBeDefined();
		if (!closestEntityInfo) return;
		expect(closestEntityInfo.entity).toEqual(mockEntitiesAndLayers.entities.at(-1));
	});
});
