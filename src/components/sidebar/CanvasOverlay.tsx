import type { FC } from 'react';
import type { Tool } from '../../tools.ts';
import { PathIcon } from '../PathIcon.tsx';
import { KeyBadge } from './SectionHeader.tsx';
import { ALIGN_COLOR, ALIGN_TOOLS, TOOL_GROUPS, TOOLS } from './sidebar.consts.ts';
import { getToolColor } from './ToolButton.tsx';
import type { AppState } from './use-app-state.ts';

interface ActiveToolInfo {
	label: string;
	groupName: string;
	color: string;
	iconPath: string;
	hint: string;
	shortcut?: string;
}

function getActiveToolInfo(tool: Tool | undefined): ActiveToolInfo | null {
	const toolDefinition = TOOLS.find((toolDefinition) => toolDefinition.tool === tool);
	if (toolDefinition) {
		return {
			label: toolDefinition.label,
			groupName: TOOL_GROUPS.find((group) => group.id === toolDefinition.group)?.name ?? '',
			color: getToolColor(toolDefinition),
			iconPath: toolDefinition.iconPath,
			hint: toolDefinition.hint,
			shortcut: toolDefinition.shortcut,
		};
	}
	const alignTool = ALIGN_TOOLS.find((alignTool) => alignTool.tool === tool);
	if (alignTool) {
		return {
			label: `Align ${alignTool.label.toLowerCase()}`,
			groupName: 'Align',
			color: ALIGN_COLOR,
			iconPath: alignTool.iconPath,
			hint: 'Align the selection',
		};
	}
	return null;
}

interface CanvasOverlayProps {
	appState: AppState;
	/**
	 * Distance from the left of the window to the left of the canvas
	 */
	left: number;
	activeLayerName: string;
	selectionLabel: string;
}

/**
 * Information about the active tool and the drawing, shown on top of the canvas
 * Mouse events pass through, so the canvas keeps receiving them
 */
export const CanvasOverlay: FC<CanvasOverlayProps> = ({
	appState,
	left,
	activeLayerName,
	selectionLabel,
}) => {
	const activeToolInfo = getActiveToolInfo(appState.activeTool);
	const transitionClasses = 'transition-[left] duration-[240ms] ease-[cubic-bezier(.2,.6,.2,1)]';

	return (
		<>
			{activeToolInfo && (
				<div
					className={`fixed top-4 z-10 flex items-center gap-3 py-2 pl-2 pr-3.5 bg-hw-ink border border-hw-line shadow-[0_8px_24px_rgba(0,0,0,.3)] pointer-events-none select-none ${transitionClasses}`}
					style={{ left: left + 16, maxWidth: `calc(100vw - ${left + 32}px)` }}
					data-id="active-tool-info"
				>
					<span
						className="grid place-items-center size-8 flex-none"
						style={{ background: activeToolInfo.color }}
					>
						<PathIcon path={activeToolInfo.iconPath} color="var(--color-hw-ink)" />
					</span>
					<div className="min-w-0">
						<div className="flex items-center gap-2 font-bold text-sm leading-[1.2] text-hw-paper">
							{activeToolInfo.label}
							{activeToolInfo.shortcut && <KeyBadge shortcut={activeToolInfo.shortcut} />}
							<span className="font-bold text-[10px] leading-none tracking-[0.16em] uppercase text-hw-stone-500">
								{activeToolInfo.groupName}
							</span>
						</div>
						<div className="text-[13px] leading-[1.4] text-hw-stone-300 text-pretty">
							{appState.instructions || activeToolInfo.hint}
						</div>
					</div>
				</div>
			)}
			<div
				className={`fixed bottom-4 z-10 flex flex-wrap gap-4 font-semibold text-xs leading-none text-hw-stone-500 pointer-events-none select-none ${transitionClasses}`}
				style={{ left: left + 16 }}
				data-id="status-bar"
			>
				<span>Layer · {activeLayerName}</span>
				<span>{selectionLabel}</span>
				<span>Zoom {Math.round(appState.screenZoom * 100)}%</span>
				<span>Snap {appState.angleStep}°</span>
			</div>
		</>
	);
};
