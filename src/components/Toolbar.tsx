import { FC, useCallback, useState } from 'react';
import { IconName } from './icon.tsx';
import { Tool } from '../tools.ts';
import { DropdownButton } from './DropdownButton.tsx';
import { Button } from './Button.tsx';
import {
  getCanvasSize,
  getEntities,
  redo,
  setActiveEntity,
  setActiveTool,
  setAngleStep,
  setSelectedEntityIds,
  undo,
} from '../state.ts';
import { convertEntitiesToSvgString } from '../helpers/export-entities-to-svg.ts';
import { saveAs } from 'file-saver';

interface ToolbarProps {}

export const Toolbar: FC<ToolbarProps> = () => {
  const [activeToolLocal, setActiveToolLocal] = useState<Tool>(Tool.Line);
  const [angleStepLocal, setAngleStepLocal] = useState<number>(45);

  const handleToolClick = useCallback((tool: Tool) => {
    console.log('set active tool: ', tool);
    setActiveToolLocal(tool);
    setActiveTool(tool);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  }, []);

  const handleExportClick = useCallback(() => {
    const entities = getEntities();
    const canvasSize = getCanvasSize();

    const svgFileContent = convertEntitiesToSvgString(entities, canvasSize);

    const blob = new Blob([svgFileContent], { type: 'text/svg;charset=utf-8' });
    saveAs(blob, 'open-web-cad--drawing.svg');
  }, []);

  const handleAngleChanged = useCallback((angle: number) => {
    setAngleStepLocal(angle);
    setAngleStep(angle);
  }, []);

  return (
    <div className="controls absolute top-0 left-0 flex flex-col gap-1 m-1">
      <Button
        title="Select"
        icon={IconName.Direction}
        onClick={() => handleToolClick(Tool.Select)}
        active={activeToolLocal === Tool.Select}
      />
      <Button
        title="Line"
        icon={IconName.Line}
        onClick={() => handleToolClick(Tool.Line)}
        active={activeToolLocal === Tool.Line}
      />
      <Button
        title="Rectangle"
        icon={IconName.Square}
        onClick={() => handleToolClick(Tool.Rectangle)}
        active={activeToolLocal === Tool.Rectangle}
      />
      <Button
        title="Circle"
        icon={IconName.Circle}
        onClick={() => handleToolClick(Tool.Circle)}
        active={activeToolLocal === Tool.Circle}
      />
      <Button
        className="mt-2"
        title="Undo"
        icon={IconName.AntiClockwise}
        onClick={() => undo()}
      />
      <Button title="Redo" icon={IconName.Clockwise} onClick={() => redo()} />
      {/* TODO add delete segments logic */}
      {/*<Button*/}
      {/*  className="mt-2"*/}
      {/*  title="Delete segments"*/}
      {/*  icon={IconName.LayersDifference}*/}
      {/*  onClick={() => handleToolClick(Tool.Eraser)}*/}
      {/*  active={activeToolLocal === Tool.Eraser}*/}
      {/*/>*/}
      <DropdownButton
        className="mt-2"
        title="Snap angles"
        label={angleStepLocal + '°'}
      >
        <Button
          title="Add guide every 5 degrees"
          label="5°"
          onClick={() => handleAngleChanged(5)}
          active={angleStepLocal === 5}
        />
        <Button
          title="Add guide every 15 degrees"
          label="15°"
          onClick={() => handleAngleChanged(15)}
          active={angleStepLocal === 15}
        />
        <Button
          title="Add guide every 30 degrees"
          label="30°"
          onClick={() => handleAngleChanged(30)}
          active={angleStepLocal === 30}
        />
        <Button
          title="Add guide every 45 degrees"
          label="45°"
          onClick={() => handleAngleChanged(45)}
          active={angleStepLocal === 45}
        />
        <Button
          title="Add guide every 90 degrees"
          label="90°"
          onClick={() => handleAngleChanged(90)}
          active={angleStepLocal === 90}
        />
      </DropdownButton>
      <Button
        className="mt-2"
        title="Export SVG"
        label="SVG"
        onClick={() => handleExportClick()}
      />
    </div>
  );
};
