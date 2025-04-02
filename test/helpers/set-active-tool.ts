import type { Tool } from '../../src/tools';
import { getActiveToolActor, setActiveToolActor } from '../../src/state';
import { Actor } from 'xstate';
import { TOOL_STATE_MACHINES } from '../../src/tools/tool.consts';

export function setActiveTool(toolName: Tool) {
    getActiveToolActor()?.stop();

    const newToolActor = new Actor(TOOL_STATE_MACHINES[toolName]);
    setActiveToolActor(newToolActor);
}
