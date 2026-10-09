import type { FC, ReactNode } from 'react';
import { TOOLBAR_WIDTH_COLLAPSED } from '../../App.consts.ts';
import { LayerList } from './LayerList.tsx';
import {
	AlignGrid,
	AngleStepPicker,
	ColorPicker,
	FileMenu,
	LineWidthPicker,
	ZoomPicker,
} from './PopoverContents.tsx';
import { KeyBadge } from './SectionHeader.tsx';
import type { AppState } from './use-app-state.ts';

export type PopoverId = 'file' | 'color' | 'width' | 'snap' | 'zoom' | 'align' | 'layers';

export const POPOVER_LABELS: Record<PopoverId, string> = {
	file: 'File',
	color: 'Colour',
	width: 'Line width',
	snap: 'Snap angle step',
	zoom: 'Zoom',
	align: 'Align selection',
	layers: 'Layers',
};

export const POPOVER_WIDTHS: Record<PopoverId, number> = {
	file: 296,
	color: 264,
	width: 264,
	snap: 296,
	zoom: 264,
	align: 256,
	layers: 288,
};

export interface Tooltip {
	label: string;
	shortcut?: string;
	hint?: string;
	top: number;
}

export interface PropertyItem {
	id: PopoverId;
	label: string;
	value: string;
	preview: ReactNode;
	shortPreview: ReactNode;
}

export function getPropertyItems(appState: AppState): PropertyItem[] {
	const zoomLabel = `${Math.round(appState.screenZoom * 100)}%`;
	const lineWidthPreview = (width: number) => (
		<span
			className="block bg-hw-paper"
			style={{ width, height: Math.max(1, Math.min(appState.lineWidth, 9)) }}
		/>
	);
	const colorSwatch = (color: string, size: number) => (
		<span
			className="block border border-hw-stone-700"
			style={{ width: size, height: size, background: color }}
		/>
	);
	return [
		{
			id: 'color',
			label: 'Colour',
			value: 'Line · Fill',
			preview: (
				<span className="flex gap-1">
					{colorSwatch(appState.lineColor, 16)}
					{colorSwatch(appState.fillColor, 16)}
				</span>
			),
			shortPreview: (
				<span className="relative size-[22px]">
					<span className="absolute top-0 left-0">{colorSwatch(appState.lineColor, 14)}</span>
					<span className="absolute right-0 bottom-0">{colorSwatch(appState.fillColor, 14)}</span>
				</span>
			),
		},
		{
			id: 'width',
			label: 'Width',
			value: `${appState.lineWidth} px`,
			preview: lineWidthPreview(18),
			shortPreview: lineWidthPreview(20),
		},
		{
			id: 'snap',
			label: 'Snap',
			value: `${appState.angleStep}°`,
			preview: null,
			shortPreview: <span>{appState.angleStep}°</span>,
		},
		{
			id: 'zoom',
			label: 'Zoom',
			value: zoomLabel,
			preview: null,
			shortPreview: <span>{Math.round(appState.screenZoom * 100)}</span>,
		},
	];
}

interface PopoverContentProps {
	id: PopoverId;
	appState: AppState;
	selectionLabel: string;
	onClose: () => void;
}

/**
 * Contents of the popover that opens next to the sidebar
 */
export const PopoverContent: FC<PopoverContentProps> = ({
	id,
	appState,
	selectionLabel,
	onClose,
}): ReactNode => {
	switch (id) {
		case 'file':
			return <FileMenu onClose={onClose} />;
		case 'color':
			return <ColorPicker lineColor={appState.lineColor} fillColor={appState.fillColor} />;
		case 'width':
			return <LineWidthPicker lineWidth={appState.lineWidth} />;
		case 'snap':
			return <AngleStepPicker angleStep={appState.angleStep} />;
		case 'zoom':
			return <ZoomPicker screenZoom={appState.screenZoom} />;
		case 'align':
			return (
				<>
					<div className="mb-2 font-bold text-[10px] leading-none tracking-[0.16em] uppercase text-hw-stone-500">
						Align selection · {selectionLabel}
					</div>
					<AlignGrid activeTool={appState.activeTool} variant="popover" />
				</>
			);
		case 'layers':
			return (
				<>
					<div className="mb-2 font-bold text-[10px] leading-none tracking-[0.16em] uppercase text-hw-stone-500">
						Layers · {appState.layers.length}
					</div>
					<LayerList layers={appState.layers} activeLayerId={appState.activeLayerId} />
				</>
			);
		default:
			return null;
	}
};

/**
 * Label, shortcut and hint of a button in the collapsed sidebar
 */
export const RailTooltip: FC<{ tooltip: Tooltip }> = ({ tooltip }) => (
	<div
		className="fixed z-30 max-w-60 py-2 px-2.5 bg-hw-ink border border-hw-line shadow-[0_8px_24px_rgba(0,0,0,.3)] pointer-events-none -translate-y-1/2"
		style={{ left: TOOLBAR_WIDTH_COLLAPSED + 8, top: tooltip.top }}
	>
		<div className="flex items-center gap-2 font-bold text-[13px] leading-[1.2] text-hw-paper">
			{tooltip.label}
			{tooltip.shortcut && <KeyBadge shortcut={tooltip.shortcut} className="text-[10px]" />}
		</div>
		{tooltip.hint && (
			<div className="mt-[3px] text-xs leading-[1.4] text-hw-stone-300">{tooltip.hint}</div>
		)}
	</div>
);
