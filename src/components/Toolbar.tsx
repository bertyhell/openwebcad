import {FC, useCallback, useEffect, useState} from 'react';
import {IconName} from './Icon/Icon.tsx';
import {Tool} from '../tools';
import {DropdownButton} from './DropdownButton.tsx';
import {Button} from './Button.tsx';
import {
	getActiveLineColor,
	getActiveLineWidth,
	getActiveToolActor,
	getAngleStep,
	getScreenCanvasDrawController,
	redo,
	setActiveLineColor,
	setActiveLineWidth,
	setActiveToolActor,
	setAngleStep, setEntities,
	undo,
} from '../state';
import {noop} from 'es-toolkit';
import {importEntitiesFromJsonFile} from '../helpers/import-export-handlers/import-entities-from-json';
import {exportEntitiesToJsonFile} from '../helpers/import-export-handlers/export-entities-to-json';
import {exportEntitiesToSvgFile} from '../helpers/import-export-handlers/export-entities-to-svg';
import {exportEntitiesToPngFile} from '../helpers/import-export-handlers/export-entities-to-png';
import {COLOR_LIST} from '../App.consts';
import {times} from '../helpers/times';
import {TOOL_STATE_MACHINES} from '../tools/tool.consts';
import {Actor} from 'xstate';
import {HtmlEvent} from '../App.types';
import {importImageFromFile} from '../helpers/import-export-handlers/import-image-from-file';
import {ActorEvent} from '../tools/tool.types';
import {imageImportToolStateMachine} from '../tools/image-import-tool';
import {exportEntitiesToPdfFile} from '../helpers/import-export-handlers/export-entities-to-pdf.ts';
import {importEntitiesFromSvgFile} from '../helpers/import-export-handlers/import-entities-from-svg.ts';
import {exportEntitiesToLocalStorage} from "../helpers/import-export-handlers/export-entities-to-local-storage.ts";

interface ToolbarProps {
}

export const Toolbar: FC<ToolbarProps> = () => {
	const [activeToolLocal, setActiveToolLocal] = useState<Tool>(Tool.LINE);
	const [angleStepLocal, setAngleStepLocal] = useState<number>(45);
	const [activeLineColorLocal, setActiveLineColorLocal] =
		useState<string>('#FFF');
	const [activeLineWidthLocal, setActiveLineWidthLocal] = useState<number>(1);
	const [screenZoomLocal, setScreenZoomLocal] = useState<number>(1);

	const fetchStateUpdatesFromOutside = useCallback(() => {
		setActiveToolLocal(getActiveToolActor()?.getSnapshot()?.context.type);
		setAngleStepLocal(getAngleStep());
		setActiveLineColorLocal(getActiveLineColor());
		setActiveLineWidthLocal(getActiveLineWidth());
		setScreenZoomLocal(getScreenCanvasDrawController().getScreenScale());
	}, []);

	const handleWheel = (event: WheelEvent) => {
		if (event.ctrlKey) {
			event.preventDefault();
		}
	};

	useEffect(() => {
		window.addEventListener('wheel', handleWheel, {passive: false});
		window.addEventListener(
			HtmlEvent.UPDATE_STATE,
			fetchStateUpdatesFromOutside,
		);

		return () => {
			window.removeEventListener('wheel', handleWheel);
			window.removeEventListener(
				HtmlEvent.UPDATE_STATE,
				fetchStateUpdatesFromOutside,
			);
		};
	}, [fetchStateUpdatesFromOutside]);

	const handleToolClick = useCallback((tool: Tool) => {
		getActiveToolActor()?.stop();

		const newToolActor = new Actor(TOOL_STATE_MACHINES[tool]);
		setActiveToolActor(newToolActor, false);
		setActiveToolLocal(tool);
	}, []);

	const handleAngleChanged = useCallback((angle: number) => {
		setAngleStepLocal(angle);
		setAngleStep(angle, false);
	}, []);

	return (
		<div className="controls absolute top-0 left-0 flex flex-col gap-1 p-1 bg-slate-950 min-h-screen">
			<DropdownButton label="Draw" title={'Draw tools'} iconName={IconName.Edit} defaultOpen>
				<Button
					className="w-full"
					title="Select (s)"
					dataId="select-button"
					iconName={IconName.Direction}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.SELECT);
					}}
					active={activeToolLocal === Tool.SELECT}
					label="Select"
				/>
				<Button
					className="w-full"
					title="Line (l)"
					dataId="line-button"
					iconName={IconName.Line}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.LINE);
					}}
					active={activeToolLocal === Tool.LINE}
					label="Line"
				/>
				<Button
					className="w-full"
					title="Rectangle (r)"
					dataId="rectangle-button"
					iconName={IconName.Square}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.RECTANGLE);
					}}
					active={activeToolLocal === Tool.RECTANGLE}
					label="Rectangle"
				/>
				<Button
					className="w-full"
					title="Circle (c)"
					dataId="circle-button"
					iconName={IconName.Circle}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.CIRCLE);
					}}
					active={activeToolLocal === Tool.CIRCLE}
					label="Circle"
				/>
				<Button
					className="mt-2 w-full"
					title="Move"
					dataId="move-button"
					iconName={IconName.Expand}
					iconClassname={'transform rotate-45'}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.MOVE)
					}}
					active={activeToolLocal === Tool.MOVE}
					label="Move"
				/>
				<Button
					className="w-full"
					title="Scale"
					dataId="scale-button"
					iconName={IconName.Scale}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.SCALE)
					}}
					active={activeToolLocal === Tool.SCALE}
					label="Scale"
				/>
				<Button
					className="w-full"
					title="Rotate"
					dataId="rotate-button"
					iconName={IconName.Clockwise}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.ROTATE)
					}}
					active={activeToolLocal === Tool.ROTATE}
					label="Rotate"
				/>

				<Button
					className="mt-2 w-full"
					title="Add measurements"
					dataId="measurement-button"
					iconName={IconName.Measurement}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.MEASUREMENT)
					}}
					active={activeToolLocal === Tool.MEASUREMENT}
					label="Measurement"
				/>
				<Button
					className="mt-2 w-full"
					title="Delete segments"
					dataId="delete-segment-button"
					iconName={IconName.Crop}
					onClick={(evt) => {
						evt.stopPropagation();
						handleToolClick(Tool.ERASER)
					}}
					active={activeToolLocal === Tool.ERASER}
					label="Eraser"
				/>
			</DropdownButton>

			<Button
				className="mt-2"
				title="Undo (ctrl + z)"
				dataId="undo-button"
				iconName={IconName.ArrowLeftCircle}
				onClick={() => undo()}
				label="Undo"
			/>
			<Button
				title="Redo (ctrl + shift + z)"
				dataId="redo-button"
				iconName={IconName.ArrowRightCircle}
				onClick={() => redo()}
				label="Redo"
			/>
			<DropdownButton
				className="mt-2"
				title="Line color"
				dataId="line-color-button"
				label="Line color"
				iconComponent={<div className="w-5 h-5" style={{backgroundColor: activeLineColorLocal}}></div>}
			>
				{COLOR_LIST.map(color => (
					<Button
						key={'line-color--' + color}
						title="Change line color"
						dataId={`line-color-${color}-button`}
						className='w-10'
						style={{backgroundColor: color}}
						active={color === activeLineColorLocal}
						onClick={(evt) => {
							evt.stopPropagation();
							setActiveLineColor(color)
						}}
					/>
				))}
			</DropdownButton>
			<DropdownButton
				title="Line width"
				dataId="line-width-button"
				label="Line width"
				iconComponent={<div className="w-5 h-0 -rotate-45 border-t-white"
									style={{borderTopWidth: activeLineWidthLocal + 'px'}}></div>}
			>
				{times<number>(9).map((width: number) => {
					const lineWidth = width + 1;
					return (
						<Button
							key={'line-width--' + lineWidth}
							title="Change line width"
							dataId={`line-width-${lineWidth}-button`}
							label={String(lineWidth) + 'px'}
							active={lineWidth === activeLineWidthLocal}
							iconComponent={<div className="w-5 h-0 -rotate-45 border-t-white"
												style={{borderTopWidth: lineWidth + 'px'}}></div>}
							style={{width: 'calc(50% - 2px)'}}
							onClick={(evt) => {
								evt.stopPropagation();
								setActiveLineWidth(lineWidth);
							}}
						/>
					);
				})}
			</DropdownButton>
			<DropdownButton title="Snap angles" iconComponent={<div className="w-5">{angleStepLocal + '°'}</div>} label="Snap angles"
							dataId="angle-guide-button">
				{[5, 15, 30, 45, 90].map((angle: number) => (
					<Button
						key={'angle-guide--' + angle}
						title={`Add guide every ${angle} degrees`}
						dataId={`angle-guide-${angle}-button`}
						label={angle + '°'}
						iconComponent={<div className={`w-5 h-0 border-t-2 border-t-white`} style={{rotate: -angle + 'deg'}}></div>}
						style={{width: 'calc(50% - 2px)'}}
						onClick={(evt) => {
							evt.stopPropagation();
							handleAngleChanged(angle)
						}}
						active={angle === angleStepLocal}
					/>
				))}
			</DropdownButton>
			<DropdownButton title="Zoom level" iconComponent={<div className="w-5">{(screenZoomLocal).toFixed(1)}</div>} label="Zoom level"
							dataId="zoom-level-button">
				{[20, 50, 75, 100, 150, 200, 400].map((zoom: number) => (
					<Button
						key={'zoom-level--' + zoom}
						title={`Zoom level ${zoom}%`}
						dataId={`zoom-level-${zoom}-button`}
						label={(zoom).toFixed(0) + '%'}
						style={{width: 'calc(30% - 2px)', padding: '8px'}}
						onClick={(evt) => {
							evt.stopPropagation();
							getScreenCanvasDrawController().setScreenScale(zoom / 100);
							setScreenZoomLocal(zoom / 100);
						}}
						active={zoom === screenZoomLocal}
					/>
					// TODO add option to fit screen
				))}
			</DropdownButton>

			<Button
				className="mt-2"
				title="Save current drawing"
				dataId="save-button"
				iconName={IconName.Save}
				onClick={() => exportEntitiesToLocalStorage()}
				label="Save drawing"
			/>

			<Button
				className="mt-2"
				title="Start a new drawing"
				dataId="new-button"
				iconName={IconName.FilePlus}
				onClick={() => setEntities([])}
				label="New drawing"
			/>

			<DropdownButton label="Import" title={'Import files'} iconName={IconName.SendUp}>
				<Button
					className="relative w-full"
					title="Import image into the current drawing"
					dataId="import-image-button"
					iconName={IconName.Image}
					onClick={noop}
					label="Import image"
				>
					<input
						className="absolute inset-0 opacity-0"
						type="file"
						accept="*.jpg,*.jpeg,*.png"
						onChange={async evt => {
							const image: HTMLImageElement =
								await importImageFromFile(evt.target.files?.[0]);
							const imageImportActor = new Actor(
								imageImportToolStateMachine,
							);
							imageImportActor.start();
							imageImportActor.send({
								type: ActorEvent.FILE_SELECTED,
								image,
							});
							setActiveToolActor(imageImportActor);
							evt.target.files = null;
						}}
					></input>
				</Button>
				<Button
					className="relative w-full"
					title="Load from JSON file"
					dataId="json-open-button"
					iconName={IconName.Folder}
					onClick={noop}
					label="Import JSON"
				>
					<input
						className="absolute inset-0 opacity-0"
						type="file"
						accept="*.json"
						onChange={async evt => {
							await importEntitiesFromJsonFile(evt.target.files?.[0]);
							evt.target.files = null;
						}}
					></input>
				</Button>
				<Button
					className="relative w-full"
					title="Load from SVG file"
					dataId="svg-open-button"
					iconName={IconName.Svg}
					onClick={noop}
					label="Import SVG"
				>
					<input
						className="absolute inset-0 opacity-0"
						type="file"
						accept="*.svg"
						onChange={async evt => {
							await importEntitiesFromSvgFile(evt.target.files?.[0]);
							evt.target.files = null;
						}}
					></input>
				</Button>
			</DropdownButton>

			<DropdownButton label="Export" title={'Export file'} iconName={IconName.SendDown}>
				<Button
					className="w-full"
					title="Save to JSON file"
					dataId="json-save-button"
					iconName={IconName.Javascript}
					onClick={() => exportEntitiesToJsonFile()}
					label="Export JSON"
				/>
				<Button
					className="w-full"
					title="Export to SVG file"
					dataId="svg-export-button"
					iconName={IconName.Svg}
					onClick={() => exportEntitiesToSvgFile()}
					label="Export SVG"
				/>
				<Button
					className="w-full"
					title="Export to PNG file"
					dataId="png-export-button"
					iconName={IconName.Png}
					onClick={() => exportEntitiesToPngFile()}
					label="Export PNG"
				/>
				<Button
					className="w-full"
					title="Export to PDF file"
					dataId="pdf-export-button"
					iconName={IconName.Pdf}
					onClick={() => exportEntitiesToPdfFile()}
					label="Export PDF"
				/>
			</DropdownButton>

			<Button
				className="mt-2"
				title="Github"
				dataId="github-link-button"
				iconName={IconName.Github}
				onClick={() =>
					window.open(
						'https://github.com/bertyhell/openwebcad',
						'_blank',
					)
				}
				label="Github repository"
			/>
		</div>
	);
};
