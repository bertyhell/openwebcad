import { type FC, type MouseEvent, type ReactNode, useEffect, useState } from 'react';
import useLocalStorageState from 'use-local-storage-state';
import { TOOLBAR_WIDTH, TOOLBAR_WIDTH_COLLAPSED } from '../../App.consts.ts';
import { HtmlEvent, LOCAL_STORAGE_KEY } from '../../App.types.ts';
import { PathIcon } from '../PathIcon.tsx';
import { CanvasOverlay } from './CanvasOverlay.tsx';
import { LayerList } from './LayerList.tsx';
import {
	AlignGrid,
	AngleStepPicker,
	ColorPicker,
	FileMenu,
	LineWidthPicker,
	ZoomPicker,
} from './PopoverContents.tsx';
import { KeyBadge, SectionHeader } from './SectionHeader.tsx';
import { redoAction, undoAction } from './sidebar.actions.ts';
import { ALIGN_COLOR, ICON_PATHS, TOOL_GROUPS, TOOLS } from './sidebar.consts.ts';
import { RailToolButton, ToolButton } from './ToolButton.tsx';
import { type AppState, useAppState } from './use-app-state.ts';

type SectionId = 'draw' | 'modify' | 'annotate' | 'align' | 'layers';
type PopoverId = 'file' | 'color' | 'width' | 'snap' | 'zoom' | 'align' | 'layers';

interface SidebarSettings {
	isCollapsed: boolean;
	openSections: Record<SectionId, boolean>;
}

const DEFAULT_SIDEBAR_SETTINGS: SidebarSettings = {
	isCollapsed: false,
	openSections: { draw: true, modify: true, annotate: true, align: false, layers: true },
};

const POPOVER_WIDTHS: Record<PopoverId, number> = {
	file: 296,
	color: 264,
	width: 264,
	snap: 296,
	zoom: 264,
	align: 256,
	layers: 288,
};

interface PopoverPosition {
	id: PopoverId;
	top: number | null;
	bottom: number | null;
}

interface Tooltip {
	label: string;
	shortcut?: string;
	hint?: string;
	top: number;
}

const HEADER_ICON_BUTTON_CLASSES =
	'grid place-items-center size-9 bg-transparent border-0 rounded-[2px] text-hw-stone-300 cursor-pointer hover:bg-hw-ash hover:text-hw-paper';

const RAIL_ICON_BUTTON_CLASSES =
	'grid place-items-center size-10 border-0 rounded-[2px] text-hw-stone-300 cursor-pointer hover:bg-hw-ash hover:text-hw-paper';

interface PropertyItem {
	id: PopoverId;
	label: string;
	value: string;
	preview: ReactNode;
	shortPreview: ReactNode;
}

function getPropertyItems(appState: AppState): PropertyItem[] {
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

export const Sidebar: FC = () => {
	const appState = useAppState();
	const [settings, setSettings] = useLocalStorageState<SidebarSettings>(LOCAL_STORAGE_KEY.SIDEBAR, {
		defaultValue: DEFAULT_SIDEBAR_SETTINGS,
	});
	const [popover, setPopover] = useState<PopoverPosition | null>(null);
	const [tooltip, setTooltip] = useState<Tooltip | null>(null);

	const isCollapsed = settings.isCollapsed;
	const openSections = { ...DEFAULT_SIDEBAR_SETTINGS.openSections, ...settings.openSections };
	const sidebarWidth = isCollapsed ? TOOLBAR_WIDTH_COLLAPSED : TOOLBAR_WIDTH;

	const toggleCollapsed = () => {
		setTooltip(null);
		setPopover(null);
		setSettings((oldSettings) => ({ ...oldSettings, isCollapsed: !oldSettings.isCollapsed }));
	};

	useEffect(() => {
		window.addEventListener(HtmlEvent.TOGGLE_SIDEBAR, toggleCollapsed);
		return () => window.removeEventListener(HtmlEvent.TOGGLE_SIDEBAR, toggleCollapsed);
	});

	const toggleSection = (sectionId: SectionId) => () => {
		setSettings((oldSettings) => ({
			...oldSettings,
			openSections: {
				...DEFAULT_SIDEBAR_SETTINGS.openSections,
				...oldSettings.openSections,
				[sectionId]: !oldSettings.openSections?.[sectionId],
			},
		}));
	};

	const openPopover = (id: PopoverId) => (evt: MouseEvent<HTMLElement>) => {
		if (popover?.id === id) {
			setPopover(null);
			return;
		}
		const rect = evt.currentTarget.getBoundingClientRect();
		const isInLowerHalf = rect.top > window.innerHeight / 2;
		setTooltip(null);
		setPopover({
			id,
			top: isInLowerHalf ? null : Math.max(12, rect.top),
			bottom: isInLowerHalf ? Math.max(12, window.innerHeight - rect.bottom) : null,
		});
	};
	const closePopover = () => setPopover(null);

	const showTooltip =
		(label: string, shortcut?: string, hint?: string) => (evt: MouseEvent<HTMLElement>) => {
			if (!isCollapsed) return;
			const rect = evt.currentTarget.getBoundingClientRect();
			setTooltip({ label, shortcut, hint, top: rect.top + rect.height / 2 });
		};
	const hideTooltip = () => setTooltip(null);

	const selectionLabel = appState.selectedCount
		? `${appState.selectedCount} selected`
		: 'Nothing selected';
	const activeLayer = appState.layers.find((layer) => layer.id === appState.activeLayerId);
	const propertyItems = getPropertyItems(appState);
	const isPopoverOpen = (id: PopoverId) => popover?.id === id;

	const renderPopoverContent = (): ReactNode => {
		switch (popover?.id) {
			case 'file':
				return <FileMenu onClose={closePopover} />;
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

	const renderExpanded = () => (
		<>
			<div className="flex items-center gap-1 p-3 border-b border-hw-ash">
				<button
					type="button"
					onClick={openPopover('file')}
					className={`flex items-center gap-2 h-9 pl-2 pr-2.5 border border-hw-line rounded-[2px] text-hw-paper cursor-pointer hover:bg-hw-ash ${
						isPopoverOpen('file') ? 'bg-hw-ash' : 'bg-transparent'
					}`}
					data-id="file-menu-button"
				>
					<PathIcon path={ICON_PATHS.file} />
					<span className="font-semibold text-sm leading-none">File</span>
					<PathIcon
						path={ICON_PATHS.chevronDown}
						size={14}
						strokeWidth={2}
						color="var(--color-hw-stone-500)"
					/>
				</button>
				<div className="flex-1" />
				<button
					type="button"
					onClick={undoAction}
					title="Undo · Ctrl Z"
					className={HEADER_ICON_BUTTON_CLASSES}
					data-id="undo-button"
				>
					<PathIcon path={ICON_PATHS.undo} />
				</button>
				<button
					type="button"
					onClick={redoAction}
					title="Redo · Ctrl Shift Z"
					className={HEADER_ICON_BUTTON_CLASSES}
					data-id="redo-button"
				>
					<PathIcon path={ICON_PATHS.redo} />
				</button>
				<div className="w-px h-5 mx-1 bg-hw-line" />
				<button
					type="button"
					onClick={toggleCollapsed}
					title="Collapse sidebar · ["
					className={HEADER_ICON_BUTTON_CLASSES}
					data-id="collapse-sidebar-button"
				>
					<PathIcon path={ICON_PATHS.collapse} />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto overflow-x-hidden pt-2 pb-4 hw-scrollbar">
				{TOOL_GROUPS.map((group) => {
					const groupTools = TOOLS.filter((toolDefinition) => toolDefinition.group === group.id);
					return (
						<div key={group.id} className="px-3 pt-1 pb-2">
							<SectionHeader
								label={group.name}
								color={group.color}
								count={groupTools.length}
								isOpen={openSections[group.id]}
								onToggle={toggleSection(group.id)}
								dataId={`dropdown-${group.id}-tools`}
							/>
							{openSections[group.id] && (
								<div className="grid grid-cols-2 gap-1 mt-1">
									{groupTools.map((toolDefinition) => (
										<ToolButton
											key={toolDefinition.tool}
											toolDefinition={toolDefinition}
											isActive={appState.activeTool === toolDefinition.tool}
										/>
									))}
								</div>
							)}
						</div>
					);
				})}

				<div className="px-3 pt-1 pb-2">
					<SectionHeader
						label="Align selection"
						color={ALIGN_COLOR}
						count={selectionLabel}
						isOpen={openSections.align}
						onToggle={toggleSection('align')}
						dataId="align-button"
					/>
					{openSections.align && <AlignGrid activeTool={appState.activeTool} variant="sidebar" />}
				</div>

				<div className="px-3 pt-1 pb-2">
					<SectionHeader
						label="Layers"
						color="var(--color-hw-stone-300)"
						count={appState.layers.length}
						isOpen={openSections.layers}
						onToggle={toggleSection('layers')}
						dataId="layers"
					/>
					{openSections.layers && (
						<LayerList layers={appState.layers} activeLayerId={appState.activeLayerId} />
					)}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1 p-3 border-t border-hw-ash">
				{propertyItems.map((propertyItem) => (
					<button
						key={propertyItem.id}
						type="button"
						onClick={openPopover(propertyItem.id)}
						className={`flex flex-col items-start gap-1.5 py-2 px-2.5 border border-hw-ink rounded-[2px] text-hw-paper text-left cursor-pointer hover:border-hw-graphite ${
							isPopoverOpen(propertyItem.id) ? 'bg-hw-ash' : 'bg-hw-ink'
						}`}
						data-id={`${propertyItem.id}-property-button`}
					>
						<span className="font-bold text-[10px] leading-none tracking-[0.16em] uppercase text-hw-stone-500">
							{propertyItem.label}
						</span>
						<span className="flex items-center gap-2 h-4 font-semibold text-sm leading-none">
							{propertyItem.preview}
							{propertyItem.value}
						</span>
					</button>
				))}
			</div>
		</>
	);

	const renderCollapsed = () => (
		<>
			<div className="flex flex-col items-center gap-0.5 py-2.5 border-b border-hw-ash">
				<button
					type="button"
					onClick={toggleCollapsed}
					onMouseEnter={showTooltip('Expand sidebar', '[')}
					onMouseLeave={hideTooltip}
					className={`${RAIL_ICON_BUTTON_CLASSES} bg-transparent`}
					data-id="expand-sidebar-button"
				>
					<PathIcon path={ICON_PATHS.expand} />
				</button>
				<button
					type="button"
					onClick={openPopover('file')}
					onMouseEnter={showTooltip('File', undefined, 'Save, new, import, export')}
					onMouseLeave={hideTooltip}
					className={`${RAIL_ICON_BUTTON_CLASSES} text-hw-paper ${isPopoverOpen('file') ? 'bg-hw-ash' : 'bg-transparent'}`}
					data-id="file-menu-button"
				>
					<PathIcon path={ICON_PATHS.file} />
				</button>
				<button
					type="button"
					onClick={undoAction}
					onMouseEnter={showTooltip('Undo', 'Ctrl Z')}
					onMouseLeave={hideTooltip}
					className={`${RAIL_ICON_BUTTON_CLASSES} bg-transparent`}
					data-id="undo-button"
				>
					<PathIcon path={ICON_PATHS.undo} />
				</button>
				<button
					type="button"
					onClick={redoAction}
					onMouseEnter={showTooltip('Redo', 'Ctrl ⇧ Z')}
					onMouseLeave={hideTooltip}
					className={`${RAIL_ICON_BUTTON_CLASSES} bg-transparent`}
					data-id="redo-button"
				>
					<PathIcon path={ICON_PATHS.redo} />
				</button>
			</div>

			<div className="flex-1 flex flex-col items-center overflow-y-auto overflow-x-hidden py-1.5 hw-scrollbar">
				{TOOL_GROUPS.map((group) => (
					<div
						key={group.id}
						className="flex flex-col items-center gap-0.5 py-1.5 border-b border-hw-divider"
					>
						<span className="w-4 h-0.5 mb-1" style={{ background: group.color }} />
						{TOOLS.filter((toolDefinition) => toolDefinition.group === group.id).map(
							(toolDefinition) => (
								<RailToolButton
									key={toolDefinition.tool}
									toolDefinition={toolDefinition}
									isActive={appState.activeTool === toolDefinition.tool}
									onMouseEnter={showTooltip(
										toolDefinition.label,
										toolDefinition.shortcut,
										toolDefinition.hint
									)}
									onMouseLeave={hideTooltip}
								/>
							)
						)}
					</div>
				))}
				<div className="flex flex-col items-center gap-0.5 py-2">
					<button
						type="button"
						onClick={openPopover('align')}
						onMouseEnter={showTooltip('Align selection', undefined, selectionLabel)}
						onMouseLeave={hideTooltip}
						className={`grid place-items-center w-10 h-9 border border-transparent rounded-[2px] cursor-pointer hover:bg-hw-ink ${
							isPopoverOpen('align') ? 'bg-hw-ash' : 'bg-transparent'
						}`}
						data-id="align-button"
					>
						<PathIcon path={ICON_PATHS.align} color={ALIGN_COLOR} />
					</button>
					<button
						type="button"
						onClick={openPopover('layers')}
						onMouseEnter={showTooltip('Layers', undefined, `Active: ${activeLayer?.name ?? '—'}`)}
						onMouseLeave={hideTooltip}
						className={`grid place-items-center w-10 h-9 border border-transparent rounded-[2px] text-hw-stone-300 cursor-pointer hover:bg-hw-ink ${
							isPopoverOpen('layers') ? 'bg-hw-ash' : 'bg-transparent'
						}`}
						data-id="layers"
					>
						<PathIcon path={ICON_PATHS.layers} />
					</button>
				</div>
			</div>

			<div className="flex flex-col items-center gap-0.5 py-2 border-t border-hw-ash">
				{propertyItems.map((propertyItem) => (
					<button
						key={propertyItem.id}
						type="button"
						onClick={openPopover(propertyItem.id)}
						onMouseEnter={showTooltip(`${propertyItem.label} · ${propertyItem.value}`)}
						onMouseLeave={hideTooltip}
						className={`grid place-items-center w-10 h-9 border-0 rounded-[2px] text-hw-paper font-bold text-[11px] leading-none cursor-pointer hover:bg-hw-ink ${
							isPopoverOpen(propertyItem.id) ? 'bg-hw-ash' : 'bg-transparent'
						}`}
						data-id={`${propertyItem.id}-property-button`}
					>
						{propertyItem.shortPreview}
					</button>
				))}
			</div>
		</>
	);

	return (
		<>
			<aside
				className="controls flex flex-col h-full overflow-hidden bg-hw-night text-hw-stone-100 border-r border-hw-ash transition-[width] duration-[240ms] ease-[cubic-bezier(.2,.6,.2,1)]"
				style={{ width: sidebarWidth }}
				data-id="sidebar"
			>
				{isCollapsed ? renderCollapsed() : renderExpanded()}
			</aside>

			<CanvasOverlay
				appState={appState}
				left={sidebarWidth}
				activeLayerName={activeLayer?.name ?? '—'}
				selectionLabel={selectionLabel}
			/>

			{tooltip && (
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
			)}

			{popover && (
				<>
					<div className="fixed inset-0 z-20" onClick={closePopover} aria-hidden="true" />
					<div
						className="controls fixed z-21 max-h-[calc(100%-24px)] overflow-auto p-3 bg-hw-ink border border-hw-line shadow-[0_16px_40px_rgba(0,0,0,.35)] text-hw-stone-100 hw-scrollbar"
						style={{
							left: sidebarWidth + 8,
							top: popover.top ?? 'auto',
							bottom: popover.bottom ?? 'auto',
							width: POPOVER_WIDTHS[popover.id],
						}}
						data-id={`${popover.id}-popover`}
					>
						{renderPopoverContent()}
					</div>
				</>
			)}
		</>
	);
};
