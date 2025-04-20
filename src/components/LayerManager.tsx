import type {FC, MouseEvent} from 'react';
import type {Layer} from '../App.types.ts';
import {getEntities, getLayers, getSelectedEntities, setEntities, setSelectedEntityIds,} from '../state.ts';
import {Button} from './Button';
import {IconName} from './Icon/Icon.tsx';

interface LayerManagerProps {
	layers: Layer[];
	setLayers: (layers: Layer[]) => void;
	activeLayerId: string;
	setActiveLayerId: (layerId: string) => void;
	className?: string;
}

export const LayerManager: FC<LayerManagerProps> = ({
	layers,
	setLayers,
	activeLayerId,
	setActiveLayerId,
	className,
}) => {
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
			entity.layerId = layerId;
		}
		console.info(`Assigned ${selectedEntities.length} entities to layer`);
	};

	const handleDeleteLayer = (evt: MouseEvent, layerId: string): void => {
		evt.stopPropagation();
		const entitiesNotOnLayer = getEntities().filter((entity) => entity.layerId !== layerId);
		setEntities(entitiesNotOnLayer);
		setLayers(getLayers().filter((layer) => layer.id !== layerId));
	};

	const handleShowHideLayer = (evt: MouseEvent, layerId: string): void => {
		evt.stopPropagation();
		const layer: Layer | undefined = layers.find((layer) => layer.id === layerId);
		if (!layer) {
			return;
		}
		layer.isVisible = !layer.isVisible;
		setLayers([...layers]);
	};

	const handleLockUnlockLayer = (evt: MouseEvent, layerId: string): void => {
		evt.stopPropagation();
		const layer: Layer | undefined = layers.find((layer) => layer.id === layerId);
		if (!layer) {
			return;
		}
		layer.isLocked = !layer.isLocked;
		setLayers([...layers]);
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
							label={layer.name}
							title="Set this layer as active"
							active={activeLayerId === layer.id}
							onClick={(evt) => handleLayerClick(evt, layer.id)}
							className="data-[active=true]:text-white flex-grow"
							left={
								<>
									<Button
										iconName={layer.isVisible ? IconName.Eye : IconName.EyeClosed}
										title="Show/hide layer content"
										onClick={(evt) => handleShowHideLayer(evt, layer.id)}
										size="small"
										className="w-10 hover:bg-blue-300 -ml-1"
										type="transparent"
										active={activeLayerId === layer.id}
									/>
									<Button
										iconName={layer.isLocked ? IconName.Lock : IconName.Unlock}
										title="Lock/Unlock layer content"
										onClick={(evt) => handleLockUnlockLayer(evt, layer.id)}
										size="small"
										className="w-10 hover:bg-blue-300"
										type="transparent"
										active={activeLayerId === layer.id}
									/>
								</>
							}
							right={
								<>
									<Button
										iconName={IconName.Direction}
										title="Select entities on this layer"
										onClick={(evt) => handleSelectEntitiesOnLayer(evt, layer.id)}
										size="small"
										className="w-10 hover:bg-blue-300"
										type="transparent"
										active={activeLayerId === layer.id}
									/>
									<Button
										iconName={IconName.Download}
										title="Assign current selection to layer"
										onClick={(evt) => handleAssignSelectionToLayer(evt, layer.id)}
										size="small"
										className="w-10 hover:bg-blue-300"
										type="transparent"
										active={activeLayerId === layer.id}
									/>
									<Button
										iconName={IconName.FolderX}
										title="delete layer and content"
										onClick={(evt) => handleDeleteLayer(evt, layer.id)}
										size="small"
										className="w-10 hover:bg-blue-300"
										type="transparent"
										active={activeLayerId === layer.id}
									/>
								</>
							}
						/>
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
