import { FC, useCallback, useEffect, useState } from 'react';
import { IconName } from './icon.tsx';
import { Tool } from '../tools.ts';
import { DropdownButton } from './DropdownButton.tsx';
import { Button } from './Button.tsx';
import {
  getActiveTool,
  getAngleStep,
  redo,
  setActiveEntity,
  setActiveTool,
  setAngleStep,
  setSelectedEntityIds,
  undo,
} from '../state.ts';
import { StateVariable } from '../helpers/undo-stack.ts';
import { exportEntitiesToSvgFile } from '../helpers/export-entities-to-svg.ts';
import { exportEntitiesToPngFile } from '../helpers/export-entities-to-png.ts';

interface ToolbarProps {}

export const Toolbar: FC<ToolbarProps> = () => {
  const [activeToolLocal, setActiveToolLocal] = useState<Tool>(Tool.Line);
  const [angleStepLocal, setAngleStepLocal] = useState<number>(45);

  const fetchStateUpdatesFromOutside = useCallback(() => {
    console.log('fetching state updates from outside: ', {
      activeTool: getActiveTool(),
      angleStep: getAngleStep(),
    });
    setActiveToolLocal(getActiveTool());
    setAngleStepLocal(getAngleStep());
  }, []);

  useEffect(() => {
    window.addEventListener(
      StateVariable.activeTool,
      fetchStateUpdatesFromOutside,
    );
    window.addEventListener(
      StateVariable.angleStep,
      fetchStateUpdatesFromOutside,
    );

    return () => {
      window.removeEventListener(
        StateVariable.activeTool,
        fetchStateUpdatesFromOutside,
      );
      window.removeEventListener(
        StateVariable.angleStep,
        fetchStateUpdatesFromOutside,
      );
    };
  }, [fetchStateUpdatesFromOutside]);

  const handleToolClick = useCallback((tool: Tool) => {
    console.log('set active tool: ', tool);
    setActiveToolLocal(tool);
    setActiveTool(tool, false);
    setActiveEntity(null);
    setSelectedEntityIds([]);
  }, []);

  const handleAngleChanged = useCallback((angle: number) => {
    setAngleStepLocal(angle);
    setAngleStep(angle, false);
  }, []);

  return (
    <div className="controls absolute top-0 left-0 flex flex-col gap-1 m-1">
      <Button
        title="Select (s)"
        icon={IconName.Direction}
        onClick={() => handleToolClick(Tool.Select)}
        active={activeToolLocal === Tool.Select}
      />
      <Button
        title="Line (l)"
        icon={IconName.Line}
        onClick={() => handleToolClick(Tool.Line)}
        active={activeToolLocal === Tool.Line}
      />
      <Button
        title="Rectangle (r)"
        icon={IconName.Square}
        onClick={() => handleToolClick(Tool.Rectangle)}
        active={activeToolLocal === Tool.Rectangle}
      />
      <Button
        title="Circle (c)"
        icon={IconName.Circle}
        onClick={() => handleToolClick(Tool.Circle)}
        active={activeToolLocal === Tool.Circle}
      />
      <Button
        className="mt-2"
        title="Undo (ctrl + z)"
        icon={IconName.AntiClockwise}
        onClick={() => undo()}
      />
      <Button
        title="Redo (ctrl + shift + z)"
        icon={IconName.Clockwise}
        onClick={() => redo()}
      />
      <Button
        className="mt-2"
        title="Delete segments"
        icon={IconName.Crop}
        onClick={() => handleToolClick(Tool.Eraser)}
        active={activeToolLocal === Tool.Eraser}
      />
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
        onClick={() => exportEntitiesToSvgFile()}
      />
      <Button
        title="Export PNG"
        label="PNG"
        onClick={() => exportEntitiesToPngFile()}
      />
      <Button
        className="mt-2"
        title="Github"
        icon={IconName.Github}
        onClick={() =>
          window.open('https://github.com/bertyhell/openwebcad', '_blank')
        }
      />
    </div>
  );
};
