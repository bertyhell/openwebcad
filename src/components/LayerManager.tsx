import type {FC, MouseEvent} from 'react';
import type {Layer} from '../App.types.ts';
import {getEntities, getLayers, getSelectedEntities, setActiveLayerId, setEntities, setLayers, setSelectedEntityIds,} from '../state.ts';
import {Button} from './Button';
import {IconName} from './Icon/Icon.tsx';

interface LayerManagerProps {
	layers: Layer[];
	activeLayerId: string;
	className?: string;
}

export const LayerManager: FC<LayerManagerProps> = ({ layers, activeLayerId, className }) => {
	const handleLayerClick = (evt: MouseEvent, layerId: string) => {
		evt.stopPropagation();
		setActiveLayerId(layerId);
	};

	const handleSelectEntitiesOnLayer = (evt: MouseEvent, layerId: string): void => {
		evt.stopPropagation();
		const entitiesOnLayer = getEntities().filter((entity) => entity.layerId === layerId);
		setSelectedEntityIds(entitiesOnLayer.map((entity) => entity.id));
	};

	const handleAssignSelectionToLayer = (evt: MouseEvent, layerId: string): void => {
		evt.stopPropagation();
		const selectedEntities = getSelectedEntities();
		for (const entity of selectedEntities) {
			entity.layerId === layerId;
		}
	};

	const handleDeleteLayer = (evt: MouseEvent, layerId: string): void => {
		evt.stopPropagation();
		const entitiesNotOnLayer = getEntities().filter((entity) => entity.layerId !== layerId);
		setEntities(entitiesNotOnLayer);
	};

	const handleCreateNewLayer = (evt: MouseEvent): void => {
		evt.stopPropagation();
		const newLayer: Layer = {
			id: crypto.randomUUID(),
			isLocked: false,
			isVisible: true,
			name: `New layer ${getLayers().length}${1}`,
		};
		setLayers([...getLayers(), newLayer]);
	};

	return (
		<div className={`layer-manager flex flex-col ${className}`}>
			<div className="layers-wrapper flex flex-col gap-2">
				{layers.map((layer) => (
					<div className="layer flex flex-row relative" key={`layer-${layer.id}`}>
						<Button
							iconName={activeLayerId === layer.id ? IconName.FolderTick : IconName.Folder}
							label={layer.name}
							title="Set this layer as active"
							active={activeLayerId === layer.id}
							onClick={(evt) => handleLayerClick(evt, layer.id)}
							className="data-[active=true]:text-white flex-grow"
						/>
						<div className="layer-options absolute right-0 top-0 bottom-0 w-auto flex flex-row">
							<Button
								iconName={IconName.Circle}
								title="Select entities on this layer"
								onClick={(evt) => handleSelectEntitiesOnLayer(evt, layer.id)}
								size="small"
								className="w-10"
								type="transparent"
								active={activeLayerId === layer.id}
							/>
							<Button
								iconName={IconName.Download}
								title="Assign current selection to layer"
								onClick={(evt) => handleAssignSelectionToLayer(evt, layer.id)}
								size="small"
								className="w-10"
								type="transparent"
								active={activeLayerId === layer.id}
							/>
							<Button
								iconName={IconName.FolderX}
								title="delete layer and content"
								onClick={(evt) => handleDeleteLayer(evt, layer.id)}
								size="small"
								className="w-10"
								type="transparent"
								active={activeLayerId === layer.id}
							/>
						</div>
					</div>
				))}
			</div>
			<Button
				label="New layer"
				iconName={IconName.FolderPlus}
				title="Create a new layer"
				onClick={(evt) => handleCreateNewLayer(evt)}
				className="w-full mt-2"
			/>
		</div>
	);
};
