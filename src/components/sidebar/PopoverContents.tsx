import { type ChangeEvent, type FC, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { COLOR_LIST } from '../../App.consts.ts';
import type { GridSettings } from '../../App.types.ts';
import { exportEntitiesToDxfFile } from '../../helpers/import-export-handlers/dxf.export.ts';
import { importEntitiesFromDxfFile } from '../../helpers/import-export-handlers/dxf.import.ts';
import { exportEntitiesToJsonFile } from '../../helpers/import-export-handlers/json.export.ts';
import { importEntitiesFromJsonFile } from '../../helpers/import-export-handlers/json.import.ts';
import { localStorageExport } from '../../helpers/import-export-handlers/local-storage.export.ts';
import { exportEntitiesToPdfFile } from '../../helpers/import-export-handlers/pdf.export.ts';
import { exportEntitiesToPngFile } from '../../helpers/import-export-handlers/png.export.ts';
import { exportEntitiesToSvgFile } from '../../helpers/import-export-handlers/svg.export.ts';
import { importEntitiesFromSvgFile } from '../../helpers/import-export-handlers/svg.import.ts';
import {
	setActiveFillColor,
	setActiveLineColor,
	setActiveLineWidth,
	setAngleStep,
	setGridSettings,
} from '../../state.ts';
import type { Tool } from '../../tools.ts';
import { PathIcon } from '../PathIcon.tsx';
import { toFullHexColor } from './color.helpers.ts';
import { PopoverLabel } from './SectionHeader.tsx';
import {
	activateTool,
	newDrawing,
	setZoomLevel,
	startImageImport,
	zoomToFit,
} from './sidebar.actions.ts';
import {
	ALIGN_COLOR,
	ALIGN_TOOLS,
	ANGLE_STEPS,
	GITHUB_URL,
	ICON_PATHS,
	LINE_WIDTHS,
	ZOOM_LEVELS,
} from './sidebar.consts.ts';

const MENU_ITEM_CLASSES =
	'flex items-center gap-2.5 h-9 px-2 bg-transparent border-0 rounded-[2px] text-hw-paper font-semibold text-sm leading-none text-left cursor-pointer hover:bg-hw-ash';

const FILE_BUTTON_CLASSES =
	'grid place-items-center h-8 bg-hw-night border border-hw-line rounded-[2px] font-semibold text-xs leading-none text-hw-stone-100 cursor-pointer hover:border-hw-stone-500';

function optionClasses(isSelected: boolean): string {
	return `border rounded-[2px] text-hw-paper font-semibold text-xs leading-none cursor-pointer hover:border-hw-stone-500 ${
		isSelected ? 'bg-hw-ash border-hw-stone-100' : 'bg-hw-night border-hw-line'
	}`;
}

interface FileImport {
	label: string;
	accept: string;
	dataId: string;
	handler: (file: File | undefined) => Promise<void>;
}

const FILE_IMPORTS: FileImport[] = [
	{
		label: 'Image',
		accept: '.jpg,.jpeg,.png',
		dataId: 'import-image-file-button',
		handler: startImageImport,
	},
	{ label: 'DXF', accept: '.dxf', dataId: 'dxf-open-button', handler: importEntitiesFromDxfFile },
	{
		label: 'JSON',
		accept: '.json',
		dataId: 'json-open-button',
		handler: importEntitiesFromJsonFile,
	},
	{ label: 'SVG', accept: '.svg', dataId: 'svg-open-button', handler: importEntitiesFromSvgFile },
];

interface FileExport {
	label: string;
	dataId: string;
	handler: () => void | Promise<void>;
}

const FILE_EXPORTS: FileExport[] = [
	{ label: 'JSON', dataId: 'json-save-button', handler: exportEntitiesToJsonFile },
	{ label: 'DXF', dataId: 'dxf-export-button', handler: exportEntitiesToDxfFile },
	{ label: 'SVG', dataId: 'svg-export-button', handler: exportEntitiesToSvgFile },
	{ label: 'PNG', dataId: 'png-export-button', handler: exportEntitiesToPngFile },
	{ label: 'PDF', dataId: 'pdf-export-button', handler: exportEntitiesToPdfFile },
];

interface PopoverContentProps {
	onClose: () => void;
}

/**
 * Button that opens a file dialog through a hidden file input, so it can be reached with the keyboard
 */
const FileImportButton: FC<{
	fileImport: FileImport;
	onChange: (evt: ChangeEvent<HTMLInputElement>) => void;
}> = ({ fileImport, onChange }) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	return (
		<>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				aria-label={`Import ${fileImport.label}`}
				className={FILE_BUTTON_CLASSES}
				data-id={fileImport.dataId}
			>
				{fileImport.label}
			</button>
			<input
				ref={fileInputRef}
				type="file"
				accept={fileImport.accept}
				onChange={onChange}
				className="hidden"
				tabIndex={-1}
				aria-hidden="true"
			/>
		</>
	);
};

export const FileMenu: FC<PopoverContentProps> = ({ onClose }) => {
	const [isConfirmingNew, setIsConfirmingNew] = useState(false);

	const handleSave = async () => {
		onClose();
		if (await localStorageExport()) {
			toast.success('Saved');
		}
	};

	const handleImport = (fileImport: FileImport) => async (evt: ChangeEvent<HTMLInputElement>) => {
		const file = evt.target.files?.[0];
		evt.target.value = '';
		onClose();
		await fileImport.handler(file);
	};

	const handleExport = (fileExport: FileExport) => async () => {
		onClose();
		await fileExport.handler();
	};

	return (
		<div className="flex flex-col gap-0.5">
			<button
				type="button"
				onClick={handleSave}
				className={MENU_ITEM_CLASSES}
				data-id="save-button"
			>
				<PathIcon path={ICON_PATHS.save} size={18} />
				<span className="flex-1">Save drawing</span>
				<span className="font-semibold text-[11px] text-hw-stone-500">Ctrl S</span>
			</button>
			<button
				type="button"
				onClick={() => setIsConfirmingNew(true)}
				className={MENU_ITEM_CLASSES}
				data-id="new-button"
			>
				<PathIcon path={ICON_PATHS.newFile} size={18} />
				<span className="flex-1">New drawing…</span>
			</button>
			{isConfirmingNew && (
				<div className="my-1 p-2.5 bg-hw-danger-bg border border-hw-danger-border">
					<div className="font-semibold text-[13px] leading-[1.4] text-hw-paper">
						Clear all entities?
					</div>
					<div className="mb-2 text-xs leading-[1.4] text-hw-stone-300">
						You can still undo this with Ctrl Z.
					</div>
					<div className="flex justify-end gap-1.5">
						<button
							type="button"
							onClick={() => setIsConfirmingNew(false)}
							className="h-7 px-2.5 bg-transparent border border-hw-stone-700 text-hw-paper font-semibold text-xs cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => {
								newDrawing();
								onClose();
								toast.info('New drawing');
							}}
							className="h-7 px-2.5 bg-hw-red border border-hw-red text-hw-paper font-semibold text-xs cursor-pointer hover:bg-hw-red-700"
							data-id="new-confirm-button"
						>
							Clear drawing
						</button>
					</div>
				</div>
			)}
			<PopoverLabel label="Import" className="mt-2.5 mx-2 mb-1.5" />
			<div className="grid grid-cols-4 gap-1 px-1">
				{FILE_IMPORTS.map((fileImport) => (
					<FileImportButton
						key={fileImport.label}
						fileImport={fileImport}
						onChange={handleImport(fileImport)}
					/>
				))}
			</div>
			<PopoverLabel label="Export" className="mt-3 mx-2 mb-1.5" />
			<div className="grid grid-cols-5 gap-1 px-1">
				{FILE_EXPORTS.map((fileExport) => (
					<button
						key={fileExport.label}
						type="button"
						onClick={handleExport(fileExport)}
						aria-label={`Export ${fileExport.label}`}
						className={FILE_BUTTON_CLASSES}
						data-id={fileExport.dataId}
					>
						{fileExport.label}
					</button>
				))}
			</div>
			<div className="h-px mt-3 mb-1 bg-hw-line" />
			<a
				href={GITHUB_URL}
				target="_blank"
				rel="noreferrer"
				className="flex items-center gap-2.5 h-9 px-2 text-hw-stone-300 font-semibold text-[13px] leading-none no-underline hover:bg-hw-ash hover:text-hw-paper"
				data-id="github-link-button"
			>
				<PathIcon path={ICON_PATHS.code} size={18} />
				<span className="flex-1">GitHub repository</span>
				<span>↗</span>
			</a>
		</div>
	);
};

const ColorGrid: FC<{
	activeColor: string;
	onSelect: (color: string) => void;
	dataIdPrefix: string;
}> = ({ activeColor, onSelect, dataIdPrefix }) => (
	<div className="grid grid-cols-8 gap-1.5">
		{COLOR_LIST.map((color) => {
			const isActive = toFullHexColor(color) === toFullHexColor(activeColor);
			return (
				<button
					key={color}
					type="button"
					title={color}
					aria-label={color}
					aria-pressed={isActive}
					onClick={() => onSelect(color)}
					className="aspect-square border-0 cursor-pointer"
					style={{
						background: color,
						outline: isActive
							? '2px solid var(--color-hw-paper)'
							: '1px solid var(--color-hw-graphite)',
						outlineOffset: 2,
					}}
					data-id={`${dataIdPrefix}-${color}-button`}
				/>
			);
		})}
	</div>
);

export const ColorPicker: FC<{ lineColor: string; fillColor: string }> = ({
	lineColor,
	fillColor,
}) => (
	<div>
		<PopoverLabel label="Line colour" />
		<ColorGrid activeColor={lineColor} onSelect={setActiveLineColor} dataIdPrefix="line-color" />
		<PopoverLabel label="Fill colour" className="mt-4" />
		<ColorGrid activeColor={fillColor} onSelect={setActiveFillColor} dataIdPrefix="fill-color" />
	</div>
);

export const LineWidthPicker: FC<{ lineWidth: number }> = ({ lineWidth }) => (
	<div>
		<PopoverLabel label="Line width" />
		<div className="grid grid-cols-3 gap-1">
			{LINE_WIDTHS.map((width) => (
				<button
					key={width}
					type="button"
					onClick={() => setActiveLineWidth(width)}
					className={`flex items-center gap-2 h-[34px] px-2 ${optionClasses(width === lineWidth)}`}
					data-id={`line-width-${width}-button`}
				>
					<span className="w-[18px] bg-hw-paper" style={{ height: width }} />
					{width} px
				</button>
			))}
		</div>
	</div>
);

const GridToggle: FC<{
	label: string;
	shortcut: string;
	isChecked: boolean;
	onToggle: () => void;
	dataId: string;
}> = ({ label, shortcut, isChecked, onToggle, dataId }) => (
	<label className="flex items-center gap-2 h-8 px-1 text-hw-paper font-semibold text-xs cursor-pointer">
		<input
			type="checkbox"
			checked={isChecked}
			onChange={onToggle}
			className="size-4 accent-hw-stone-100"
			data-id={dataId}
		/>
		<span className="flex-1">{label}</span>
		<span className="text-[11px] text-hw-stone-500">{shortcut}</span>
	</label>
);

export const AngleStepPicker: FC<{ angleStep: number; gridSettings: GridSettings }> = ({
	angleStep,
	gridSettings,
}) => (
	<div>
		<PopoverLabel label="Snap angle step" />
		<div className="grid grid-cols-5 gap-1">
			{ANGLE_STEPS.map((angle) => (
				<button
					key={angle}
					type="button"
					title={`Add guide every ${angle} degrees`}
					onClick={() => setAngleStep(angle)}
					className={`flex flex-col items-center gap-2 pt-2.5 pb-2 ${optionClasses(angle === angleStep)}`}
					data-id={`angle-guide-${angle}-button`}
				>
					<span
						className="w-[18px] h-0.5 ml-3 bg-hw-stone-300 origin-left"
						style={{ transform: `rotate(-${angle}deg)` }}
					/>
					{angle}°
				</button>
			))}
		</div>
		<PopoverLabel label="Grid" className="mt-4" />
		<GridToggle
			label="Show grid"
			shortcut="F7"
			isChecked={gridSettings.isVisible}
			onToggle={() => setGridSettings({ ...gridSettings, isVisible: !gridSettings.isVisible })}
			dataId="grid-visible-checkbox"
		/>
		<GridToggle
			label="Snap to grid"
			shortcut="F9"
			isChecked={gridSettings.isSnapEnabled}
			onToggle={() =>
				setGridSettings({ ...gridSettings, isSnapEnabled: !gridSettings.isSnapEnabled })
			}
			dataId="grid-snap-checkbox"
		/>
	</div>
);

export const ZoomPicker: FC<{ screenZoom: number }> = ({ screenZoom }) => (
	<div>
		<PopoverLabel label="Zoom" />
		<div className="grid grid-cols-4 gap-1">
			{ZOOM_LEVELS.map((zoom) => (
				<button
					key={zoom}
					type="button"
					onClick={() => setZoomLevel(zoom)}
					className={`h-8 ${optionClasses(Math.round(screenZoom * 100) === zoom)}`}
					data-id={`zoom-level-${zoom}-button`}
				>
					{zoom}%
				</button>
			))}
			<button
				type="button"
				title="Zoom to the bounds of the drawing"
				onClick={zoomToFit}
				className={`h-8 ${optionClasses(false)}`}
				data-id="zoom-level-bounds-button"
			>
				Fit all
			</button>
		</div>
	</div>
);

interface AlignGridProps {
	activeTool: Tool | undefined;
	/**
	 * Inline grid in the expanded sidebar or compact grid inside the popover
	 */
	variant: 'sidebar' | 'popover';
}

export const AlignGrid: FC<AlignGridProps> = ({ activeTool, variant }) => (
	<div className={`grid grid-cols-3 gap-1 ${variant === 'sidebar' ? 'mt-1' : ''}`}>
		{ALIGN_TOOLS.map((alignTool) => {
			const isActive = alignTool.tool === activeTool;
			return (
				<button
					key={alignTool.tool}
					type="button"
					title={`Align ${alignTool.label.toLowerCase()}`}
					onClick={() => activateTool(alignTool.tool)}
					className={`flex flex-col items-center justify-center gap-1 border rounded-[2px] font-semibold text-[11px] leading-none cursor-pointer hover:text-hw-paper ${
						variant === 'sidebar'
							? 'h-[52px] bg-hw-ink border-hw-ink hover:border-hw-graphite'
							: 'py-2 bg-hw-night border-hw-line hover:border-hw-stone-500'
					} ${isActive ? 'text-hw-paper' : 'text-hw-stone-300'}`}
					style={
						isActive
							? {
									background: `color-mix(in oklch, ${ALIGN_COLOR} 22%, var(--color-hw-night))`,
									borderColor: ALIGN_COLOR,
								}
							: undefined
					}
					data-id={alignTool.dataId}
				>
					<PathIcon path={alignTool.iconPath} color={ALIGN_COLOR} />
					{alignTool.label}
				</button>
			);
		})}
	</div>
);
