import type { FC } from 'react';
import { toast } from 'react-toastify';
import type { Layer } from '../../App.types.ts';
import { setActiveLayerId } from '../../state.ts';
import { PathIcon } from '../PathIcon.tsx';
import {
	createLayer,
	deleteLayer,
	moveSelectionToLayer,
	selectEntitiesOnLayer,
	toggleLayerLock,
	toggleLayerVisibility,
} from './sidebar.actions.ts';
import { ICON_PATHS } from './sidebar.consts.ts';

interface LayerListProps {
	layers: Layer[];
	activeLayerId: string;
}

const LAYER_ICON_BUTTON_CLASSES =
	'grid place-items-center flex-none h-7 bg-transparent border-0 cursor-pointer hover:text-hw-paper';

export const LayerList: FC<LayerListProps> = ({ layers, activeLayerId }) => {
	const canDeleteLayers = layers.length > 1;

	return (
		<div className="flex flex-col gap-0.5 mt-1" data-id="layer-list">
			{layers.map((layer) => {
				const isActive = layer.id === activeLayerId;
				const nameColorClass = isActive
					? 'text-hw-paper font-bold'
					: layer.isVisible
						? 'text-hw-stone-300 font-semibold'
						: 'text-hw-stone-700 font-semibold';
				return (
					<div
						key={layer.id}
						className={`flex items-center h-9 px-0.5 border rounded-[2px] ${
							isActive ? 'bg-hw-ash border-hw-graphite' : 'bg-transparent border-transparent'
						}`}
						data-id={`layer-${layer.id}`}
					>
						<button
							type="button"
							title={layer.isVisible ? 'Hide layer' : 'Show layer'}
							onClick={() => toggleLayerVisibility(layer.id)}
							className={`${LAYER_ICON_BUTTON_CLASSES} w-7 ${
								layer.isVisible ? 'text-hw-stone-300' : 'text-hw-stone-700'
							}`}
						>
							<PathIcon
								path={layer.isVisible ? ICON_PATHS.eye : ICON_PATHS.eyeOff}
								size={16}
								strokeWidth={1.75}
							/>
						</button>
						<button
							type="button"
							title={layer.isLocked ? 'Unlock layer' : 'Lock layer'}
							onClick={() => toggleLayerLock(layer.id)}
							className={`${LAYER_ICON_BUTTON_CLASSES} w-7 ${
								layer.isLocked ? 'text-hw-modify' : 'text-hw-stone-700'
							}`}
						>
							<PathIcon
								path={layer.isLocked ? ICON_PATHS.lock : ICON_PATHS.unlock}
								size={16}
								strokeWidth={1.75}
							/>
						</button>
						<button
							type="button"
							title="Make active layer"
							onClick={() => setActiveLayerId(layer.id)}
							className={`flex-1 min-w-0 h-7 px-1.5 bg-transparent border-0 text-left text-[13px] leading-none whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer ${nameColorClass}`}
						>
							{layer.name}
						</button>
						<button
							type="button"
							title="Select all on layer"
							onClick={() => {
								const count = selectEntitiesOnLayer(layer.id);
								toast.info(`Selected ${count} entities on ${layer.name}`);
							}}
							className={`${LAYER_ICON_BUTTON_CLASSES} w-[26px] text-hw-stone-700`}
						>
							<PathIcon path={ICON_PATHS.selectAll} size={15} strokeWidth={1.75} />
						</button>
						<button
							type="button"
							title="Move selection to layer"
							onClick={() => {
								const count = moveSelectionToLayer(layer.id);
								if (count) {
									toast.info(`Moved ${count} entities to ${layer.name}`);
								} else {
									toast.info('Select entities first');
								}
							}}
							className={`${LAYER_ICON_BUTTON_CLASSES} w-[26px] text-hw-stone-700`}
						>
							<PathIcon path={ICON_PATHS.moveToLayer} size={15} strokeWidth={1.75} />
						</button>
						<button
							type="button"
							title={
								canDeleteLayers ? 'Delete layer and contents' : 'The last layer cannot be deleted'
							}
							disabled={!canDeleteLayers}
							onClick={() => deleteLayer(layer.id)}
							className={`${LAYER_ICON_BUTTON_CLASSES} w-[26px] text-hw-stone-700 hover:text-hw-danger-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-hw-stone-700`}
						>
							<PathIcon path={ICON_PATHS.trash} size={15} strokeWidth={1.75} />
						</button>
					</div>
				);
			})}
			<button
				type="button"
				onClick={createLayer}
				data-id="new-layer-button"
				className="flex items-center gap-2 h-[34px] mt-0.5 px-2 bg-transparent border border-dashed border-hw-line rounded-[2px] text-hw-stone-500 font-semibold text-[13px] leading-none cursor-pointer hover:text-hw-paper hover:border-hw-stone-700"
			>
				<PathIcon path={ICON_PATHS.plus} size={16} strokeWidth={1.75} />
				New layer
			</button>
		</div>
	);
};
