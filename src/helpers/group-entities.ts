import type { Entity } from '../entities/Entity';
import { GroupEntity } from '../entities/GroupEntity.ts';

/**
 * Replaces the selected entities by one group, at the position of the topmost selected entity
 */
export function groupEntities(
	selectedEntities: Entity[],
	entities: Entity[]
): {
	entities: Entity[];
	group: GroupEntity | null;
} {
	const selectedIds = new Set(selectedEntities.map((entity) => entity.id));
	const members = entities.filter((entity) => selectedIds.has(entity.id));
	if (members.length < 2) {
		return { entities, group: null };
	}
	const group = new GroupEntity(members);
	const lastMemberIndex = entities.findLastIndex((entity) => selectedIds.has(entity.id));
	const newEntities = entities.flatMap((entity, index) => {
		if (index === lastMemberIndex) {
			return [group];
		}
		return selectedIds.has(entity.id) ? [] : [entity];
	});
	return { entities: newEntities, group };
}
