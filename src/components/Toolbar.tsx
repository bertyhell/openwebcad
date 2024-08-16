import { FC, useCallback } from 'react';
import { IconName } from './icon.tsx';
import { Tool } from '../tools.ts';
import { DropdownButton } from './DropdownButton.tsx';
import { Button } from './Button.tsx';
import {
  getActiveTool,
  getAngleStep,
  getCanvasSize,
  getEntities,
  setActiveEntity,
  setActiveTool,
  setAngleStep,
  setEntities,
} from '../state.ts';
import { deSelectEntities } from '../helpers/select-entities.ts';
import { convertEntitiesToSvgString } from '../helpers/export-entities-to-svg.ts';
import { saveAs } from 'file-saver';

interface ToolbarProps {}

export const Toolbar: FC<ToolbarProps> = () => {
  const activeTool = getActiveTool();
  const angleStep = getAngleStep();

  const handleToolClick = useCallback((tool: Tool) => {
    console.log('set active tool: ', tool);
    const entities = getEntities();
    setActiveTool(tool);
    setActiveEntity(null);
    setEntities(deSelectEntities(entities));
  }, []);

  const handleExportClick = useCallback(() => {
    const entities = getEntities();
    const canvasSize = getCanvasSize();

    const svgFileContent = convertEntitiesToSvgString(entities, canvasSize);

    const blob = new Blob([svgFileContent], { type: 'text/svg;charset=utf-8' });
    saveAs(blob, 'open-web-cad--drawing.svg');
  }, []);

  return (
    <div className="controls absolute top-0 left-0 flex flex-col gap-1 m-1">
      <Button
        title="Select"
        icon={IconName.Direction}
        onClick={() => handleToolClick(Tool.Select)}
        active={activeTool === Tool.Select}
      />
      <Button
        title="Line"
        icon={IconName.Line}
        onClick={() => handleToolClick(Tool.Line)}
        active={activeTool === Tool.Line}
      />
      <Button
        title="Rectangle"
        icon={IconName.Square}
        onClick={() => handleToolClick(Tool.Rectangle)}
        active={activeTool === Tool.Rectangle}
      />
      <Button
        title="Circle"
        icon={IconName.Circle}
        onClick={() => handleToolClick(Tool.Circle)}
        active={activeTool === Tool.Circle}
      />
      {/* TODO add delete segments logic */}
      {/*<Button*/}
      {/*  className="mt-2"*/}
      {/*  title="Delete segments"*/}
      {/*  icon={IconName.LayersDifference}*/}
      {/*  onClick={() => handleToolClick(Tool.Eraser)}*/}
      {/*  active={activeTool === Tool.Eraser}*/}
      {/*/>*/}
      <DropdownButton
        className="mt-2"
        title="Snap angles"
        label={angleStep + '°'}
      >
        <Button
          title="Add guide every 5 degrees"
          label="5°"
          onClick={() => setAngleStep(5)}
          active={angleStep === 5}
        />
        <Button
          title="Add guide every 15 degrees"
          label="15°"
          onClick={() => setAngleStep(15)}
          active={angleStep === 15}
        />
        <Button
          title="Add guide every 30 degrees"
          label="30°"
          onClick={() => setAngleStep(30)}
          active={angleStep === 30}
        />
        <Button
          title="Add guide every 45 degrees"
          label="45°"
          onClick={() => setAngleStep(45)}
          active={angleStep === 45}
        />
        <Button
          title="Add guide every 90 degrees"
          label="90°"
          onClick={() => setAngleStep(90)}
          active={angleStep === 90}
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
