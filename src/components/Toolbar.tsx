import { FC } from 'react';
import { IconName } from './icon.tsx';
import { Tool } from '../tools.ts';
import { DropdownButton } from './DropdownButton.tsx';
import { Button } from './Button.tsx';

interface ToolbarProps {
  activeTool: Tool;
  onToolClick: (newTool: Tool) => void;
  activeAngle: number;
  setActiveAngle: (newAngle: number) => void;
  onExportClick: () => void;
}

export const Toolbar: FC<ToolbarProps> = ({
  activeTool,
  onToolClick,
  activeAngle,
  setActiveAngle,
  onExportClick,
}) => {
  return (
    <div className="controls absolute top-0 left-0 flex flex-col gap-1 m-1">
      <Button
        title="Select"
        icon={IconName.Direction}
        onClick={() => onToolClick(Tool.Select)}
        active={activeTool === Tool.Select}
      />
      <Button
        title="Line"
        icon={IconName.Line}
        onClick={() => onToolClick(Tool.Line)}
        active={activeTool === Tool.Line}
      />
      <Button
        title="Rectangle"
        icon={IconName.Square}
        onClick={() => onToolClick(Tool.Rectangle)}
        active={activeTool === Tool.Rectangle}
      />
      <Button
        title="Circle"
        icon={IconName.Circle}
        onClick={() => onToolClick(Tool.Circle)}
        active={activeTool === Tool.Circle}
      />
      {/* TODO add delete segments logic */}
      {/*<Button*/}
      {/*  className="mt-2"*/}
      {/*  title="Delete segments"*/}
      {/*  icon={IconName.LayersDifference}*/}
      {/*  onClick={() => onToolClick(Tool.Eraser)}*/}
      {/*  active={activeTool === Tool.Eraser}*/}
      {/*/>*/}
      <DropdownButton
        className="mt-2"
        title="Snap angles"
        label={activeAngle + '°'}
      >
        <Button
          title="Add guide every 5 degrees"
          label="5°"
          onClick={() => setActiveAngle(5)}
          active={activeAngle === 5}
        />
        <Button
          title="Add guide every 15 degrees"
          label="15°"
          onClick={() => setActiveAngle(15)}
          active={activeAngle === 15}
        />
        <Button
          title="Add guide every 30 degrees"
          label="30°"
          onClick={() => setActiveAngle(30)}
          active={activeAngle === 30}
        />
        <Button
          title="Add guide every 45 degrees"
          label="45°"
          onClick={() => setActiveAngle(45)}
          active={activeAngle === 45}
        />
        <Button
          title="Add guide every 90 degrees"
          label="90°"
          onClick={() => setActiveAngle(90)}
          active={activeAngle === 90}
        />
      </DropdownButton>
      <Button
        className="mt-2"
        title="Export SVG"
        label="SVG"
        onClick={() => onExportClick()}
      />
    </div>
  );
};
