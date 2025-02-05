import { FC, useCallback, useEffect, useState } from 'react';
import { IconName } from './Icon/Icon.tsx';
import { Tool } from '../tools';
import { DropdownButton } from './DropdownButton.tsx';
import { Button } from './Button.tsx';
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
    setAngleStep,
    undo,
} from '../state';
import { noop } from 'es-toolkit';
import { importEntitiesFromJsonFile } from '../helpers/import-export-handlers/import-entities-from-json';
import { exportEntitiesToJsonFile } from '../helpers/import-export-handlers/export-entities-to-json';
import { exportEntitiesToSvgFile } from '../helpers/import-export-handlers/export-entities-to-svg';
import { exportEntitiesToPngFile } from '../helpers/import-export-handlers/export-entities-to-png';
import { COLOR_LIST } from '../App.consts';
import { times } from '../helpers/times';
import { TOOL_STATE_MACHINES } from '../tools/tool.consts';
import { Actor } from 'xstate';
import { HtmlEvent } from '../App.types';
import { Point } from '@flatten-js/core';
import { importImageFromFile } from '../helpers/import-export-handlers/import-image-from-file';
import { ActorEvent } from '../tools/tool.types';
import { imageImportToolStateMachine } from '../tools/image-import-tool';
import { exportEntitiesToPdfFile } from '../helpers/import-export-handlers/export-entities-to-pdf.ts';
import { importEntitiesFromSvgFile } from '../helpers/import-export-handlers/import-entities-from-svg.ts';

interface ToolbarProps {}

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
        window.addEventListener('wheel', handleWheel, { passive: false });
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

    const handleZoomLevelClicked = useCallback(() => {
        getScreenCanvasDrawController().setScreenScale(1);
        getScreenCanvasDrawController().setScreenOffset(new Point(0, 0));
    }, []);

    return (
        <div className="controls absolute top-0 left-0 flex flex-col gap-1 m-1">
            <Button
                title="Select (s)"
                dataId="select-button"
                icon={IconName.Direction}
                onClick={() => {
                    handleToolClick(Tool.SELECT);
                }}
                active={activeToolLocal === Tool.SELECT}
            />
            <Button
                title="Line (l)"
                dataId="line-button"
                icon={IconName.Line}
                onClick={() => {
                    handleToolClick(Tool.LINE);
                }}
                active={activeToolLocal === Tool.LINE}
            />
            <Button
                title="Rectangle (r)"
                dataId="rectangle-button"
                icon={IconName.Square}
                onClick={() => {
                    handleToolClick(Tool.RECTANGLE);
                }}
                active={activeToolLocal === Tool.RECTANGLE}
            />
            <Button
                title="Circle (c)"
                dataId="circle-button"
                icon={IconName.Circle}
                onClick={() => {
                    handleToolClick(Tool.CIRCLE);
                }}
                active={activeToolLocal === Tool.CIRCLE}
            />
            <Button
                className="mt-2"
                title="Move"
                dataId="move-button"
                icon={IconName.Expand}
                iconClassname={'transform rotate-45'}
                onClick={() => handleToolClick(Tool.MOVE)}
                active={activeToolLocal === Tool.MOVE}
            />
            <Button
                title="Scale"
                dataId="scale-button"
                icon={IconName.Scale}
                onClick={() => handleToolClick(Tool.SCALE)}
                active={activeToolLocal === Tool.SCALE}
            />
            <Button
                title="Rotate"
                dataId="rotate-button"
                icon={IconName.Clockwise}
                onClick={() => handleToolClick(Tool.ROTATE)}
                active={activeToolLocal === Tool.ROTATE}
            />

            <Button
                className="mt-2"
                title="Add measurements"
                dataId="measurement-button"
                icon={IconName.Measurement}
                onClick={() => handleToolClick(Tool.MEASUREMENT)}
                active={activeToolLocal === Tool.MEASUREMENT}
            />

            <Button
                className="mt-2"
                title="Undo (ctrl + z)"
                dataId="undo-button"
                icon={IconName.ArrowLeftCircle}
                onClick={() => undo()}
            />
            <Button
                title="Redo (ctrl + shift + z)"
                dataId="redo-button"
                icon={IconName.ArrowRightCircle}
                onClick={() => redo()}
            />
            <Button
                className="mt-2"
                title="Delete segments"
                dataId="delete-segment-button"
                icon={IconName.Crop}
                onClick={() => handleToolClick(Tool.ERASER)}
                active={activeToolLocal === Tool.ERASER}
            />
            <DropdownButton
                className="mt-2"
                title="Line color"
                dataId="line-color-button"
                buttonStyle={{ backgroundColor: activeLineColorLocal }}
            >
                {COLOR_LIST.map(color => (
                    <Button
                        key={'line-color--' + color}
                        title="Change line color"
                        dataId={`line-color-${color}-button`}
                        style={{ backgroundColor: color }}
                        active={color === activeLineColorLocal}
                        onClick={() => setActiveLineColor(color)}
                    />
                ))}
            </DropdownButton>
            <DropdownButton
                title="Line width"
                dataId="line-width-button"
                label={String(activeLineWidthLocal) + 'px'}
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
                            onClick={() => setActiveLineWidth(lineWidth)}
                        />
                    );
                })}
            </DropdownButton>
            <DropdownButton title="Snap angles" label={angleStepLocal + '°'}>
                dataId="angle-guide-button"
                <Button
                    title="Add guide every 5 degrees"
                    dataId="angle-guide-5-button"
                    label="5°"
                    onClick={() => handleAngleChanged(5)}
                    active={angleStepLocal === 5}
                />
                <Button
                    title="Add guide every 15 degrees"
                    dataId="angle-guide-15-button"
                    label="15°"
                    onClick={() => handleAngleChanged(15)}
                    active={angleStepLocal === 15}
                />
                <Button
                    title="Add guide every 30 degrees"
                    dataId="angle-guide-30-button"
                    label="30°"
                    onClick={() => handleAngleChanged(30)}
                    active={angleStepLocal === 30}
                />
                <Button
                    title="Add guide every 45 degrees"
                    dataId="angle-guide-45-button"
                    label="45°"
                    onClick={() => handleAngleChanged(45)}
                    active={angleStepLocal === 45}
                />
                <Button
                    title="Add guide every 90 degrees"
                    dataId="angle-guide-90-button"
                    label="90°"
                    onClick={() => handleAngleChanged(90)}
                    active={angleStepLocal === 90}
                />
            </DropdownButton>
            <Button
                title="Zoom level"
                dataId="zoom-level-button"
                label={(screenZoomLocal * 100).toFixed(0) + '%'}
                onClick={handleZoomLevelClicked}
            ></Button>

            <Button
                className="relative mt-2"
                title="Import image into the current drawing"
                dataId="import-image-button"
                icon={IconName.Image}
                onClick={noop}
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
                className="relative"
                title="Load from JSON file"
                dataId="json-open-button"
                icon={IconName.Folder}
                onClick={noop}
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
                className="relative"
                title="Load from SVG file"
                dataId="svg-open-button"
                icon={IconName.Svg}
                onClick={noop}
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
            <Button
                title="Save to JSON file"
                dataId="json-save-button"
                icon={IconName.Save}
                onClick={() => exportEntitiesToJsonFile()}
            />
            <Button
                title="Export to SVG file"
                dataId="svg-export-button"
                label="SVG"
                onClick={() => exportEntitiesToSvgFile()}
            />
            <Button
                title="Export to PNG file"
                dataId="png-export-button"
                label="PNG"
                onClick={() => exportEntitiesToPngFile()}
            />
            <Button
                title="Export to PDF file"
                dataId="pdf-export-button"
                label="PDF"
                onClick={() => exportEntitiesToPdfFile()}
            />
            <Button
                className="mt-2"
                title="Github"
                dataId="github-link-button"
                icon={IconName.Github}
                onClick={() =>
                    window.open(
                        'https://github.com/bertyhell/openwebcad',
                        '_blank',
                    )
                }
            />
        </div>
    );
};
